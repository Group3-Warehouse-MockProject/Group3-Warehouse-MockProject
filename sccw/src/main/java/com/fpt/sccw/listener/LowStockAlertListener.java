package com.fpt.sccw.listener;

import com.fpt.sccw.dto.response.NotificationEventDTO;
import com.fpt.sccw.entity.Inventory;
import com.fpt.sccw.entity.User;
import com.fpt.sccw.event.InventoryChangedEvent;
import com.fpt.sccw.repository.InventoryRepository;
import com.fpt.sccw.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class LowStockAlertListener {

    private final InventoryRepository inventoryRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    private static final long LOW_STOCK_THRESHOLD = 10L;

    @EventListener
    @Transactional(readOnly = true)
    public void onInventoryChanged(InventoryChangedEvent event) {
        try {
            Long inventoryId = event.getInventoryId();
            if (inventoryId == null) return;

            Inventory inventory = inventoryRepository.findById(inventoryId).orElse(null);
            if (inventory == null) return;

            if (inventory.getQuantity() <= LOW_STOCK_THRESHOLD) {
                // Find users assigned to this warehouse who are managers
                List<User> users = userRepository.findByWarehouseId(inventory.getWarehouse().getId());
                for (User user : users) {
                    if (user.getRole() != null && 
                        (user.getRole().getRoleName().name().equals("MANAGER") || 
                         user.getRole().getRoleName().name().equals("WAREHOUSE_MANAGER"))) {
                        
                        NotificationEventDTO notification = NotificationEventDTO.builder()
                                .id(UUID.randomUUID().toString())
                                .userId(user.getId().toString())
                                .title("Low Stock Alert")
                                .message("Product " + inventory.getProduct().getCode() + " is running low in Warehouse " + inventory.getWarehouse().getCode() + ". Current quantity: " + inventory.getQuantity())
                                .type("WARNING")
                                .createdAt(Instant.now().toString())
                                .build();
                        eventPublisher.publishEvent(notification);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error processing low stock alert for inventory ID {}: {}", event.getInventoryId(), e.getMessage());
        }
    }
}
