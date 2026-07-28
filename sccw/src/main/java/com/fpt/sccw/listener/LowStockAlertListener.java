package com.fpt.sccw.listener;

import com.fpt.sccw.dto.response.NotificationEventDTO;
import com.fpt.sccw.entity.*;
import com.fpt.sccw.event.InventoryChangedEvent;
import com.fpt.sccw.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Component
@RequiredArgsConstructor
@Slf4j
public class LowStockAlertListener {

    private final InventoryRepository inventoryRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final WarehouseReceiptRepository warehouseReceiptRepository;
    private final ApplicationEventPublisher eventPublisher;

    private static final long DEFAULT_THRESHOLD = 10L;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onInventoryChanged(InventoryChangedEvent event) {
        try {
            Long inventoryId = event.getInventoryId();
            if (inventoryId == null) return;

            Inventory inventory = inventoryRepository.findById(inventoryId).orElse(null);
            if (inventory == null) return;

            // Use per-inventory threshold, fallback to default
            long threshold = (inventory.getLowStockThreshold() != null && inventory.getLowStockThreshold() > 0)
                    ? inventory.getLowStockThreshold()
                    : DEFAULT_THRESHOLD;

            if (inventory.getQuantity() <= threshold) {
                String productCode = inventory.getProduct().getCode();
                Long warehouseId = inventory.getWarehouse().getId();
                String warehouseCode = inventory.getWarehouse().getCode();

                // Find managers/warehouse managers for this warehouse
                List<User> users = userRepository.findByWarehouseId(warehouseId);
                User firstManager = null;

                for (User user : users) {
                    if (user.getRole() != null &&
                        (user.getRole().getRoleName() == Role.RoleName.MANAGER ||
                         user.getRole().getRoleName() == Role.RoleName.WAREHOUSE_MANAGER)) {

                        if (firstManager == null) firstManager = user;

                        // Anti-spam: skip if user already has an unread low stock alert for this product
                        boolean alreadyNotified = notificationRepository
                                .existsByUserIdAndTitleContainingAndIsReadFalse(user.getId(), productCode);
                        if (alreadyNotified) continue;

                        NotificationEventDTO notification = NotificationEventDTO.builder()
                                .id(UUID.randomUUID().toString())
                                .userId(user.getId().toString())
                                .title("⚠️ Low Stock Alert — " + productCode)
                                .message("Product " + productCode + " is running low in Warehouse " + warehouseCode
                                        + ". Current quantity: " + inventory.getQuantity() + " (threshold: " + threshold + ")")
                                .type("WARNING")
                                .createdAt(Instant.now().toString())
                                .build();
                        eventPublisher.publishEvent(notification);
                    }
                }

                // Auto-reorder: create a PENDING inbound receipt if none exists
                if (firstManager != null) {
                    boolean pendingExists = warehouseReceiptRepository
                            .existsPendingInboundForProduct(warehouseId, inventory.getProduct().getId());

                    if (!pendingExists) {
                        long reorderQty = Math.max(1, threshold * 2 - inventory.getQuantity());
                        createAutoReorderReceipt(inventory, firstManager, reorderQty);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error processing low stock alert for inventory ID {}: {}", event.getInventoryId(), e.getMessage(), e);
        }
    }

    private void createAutoReorderReceipt(Inventory inventory, User manager, long reorderQty) {
        Product product = inventory.getProduct();
        Warehouse warehouse = inventory.getWarehouse();

        String supplierName = product.getSupplier() != null ? product.getSupplier().getName() : "Supplier";
        BigDecimal unitPrice = product.getCost() != null && product.getCost().compareTo(BigDecimal.ZERO) > 0 
                ? product.getCost() : BigDecimal.ONE;

        WarehouseReceipt receipt = WarehouseReceipt.builder()
                .type(Status.TransactionType.INBOUND)
                .status(Status.ReceiptStatus.PENDING)
                .remark("Auto-generated reorder — Low stock alert for " + product.getCode()
                        + " (current: " + inventory.getQuantity() + ", threshold: " + inventory.getLowStockThreshold() + ")")
                .partner(supplierName)
                .user(manager)
                .warehouse(warehouse)
                .build();

        ReceiptDetail detail = ReceiptDetail.builder()
                .receipt(receipt)
                .product(product)
                .quantity(reorderQty)
                .price(unitPrice)
                .build();

        receipt.setDetails(new LinkedHashSet<>(Set.of(detail)));
        warehouseReceiptRepository.save(receipt);

        log.info("Auto-reorder created: {} units of {} for warehouse {} (Receipt ID: pending save)",
                reorderQty, product.getCode(), warehouse.getCode());

        // Notify the manager about the auto-reorder
        NotificationEventDTO reorderNotification = NotificationEventDTO.builder()
                .id(UUID.randomUUID().toString())
                .userId(manager.getId().toString())
                .title("🔄 Auto-Reorder Created — " + product.getCode())
                .message("An inbound receipt for " + reorderQty + " units of " + product.getCode()
                        + " has been auto-created for Warehouse " + warehouse.getCode()
                        + ". Please review and approve.")
                .type("INFO")
                .createdAt(Instant.now().toString())
                .build();
        eventPublisher.publishEvent(reorderNotification);
    }
}
