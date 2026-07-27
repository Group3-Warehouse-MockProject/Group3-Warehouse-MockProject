package com.fpt.sccw.job;

import com.fpt.sccw.entity.Inventory;
import com.fpt.sccw.entity.Notification;
import com.fpt.sccw.entity.User;
import com.fpt.sccw.repository.InventoryRepository;
import com.fpt.sccw.repository.NotificationRepository;
import com.fpt.sccw.repository.ReceiptDetailRepository;
import com.fpt.sccw.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class VelocityAnalyzerJob {

    private final InventoryRepository inventoryRepository;
    private final ReceiptDetailRepository receiptDetailRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void analyzeVelocity() {
        log.info("Starting VelocityAnalyzerJob...");
        List<Inventory> inventories = inventoryRepository.findAll();
        Instant since = Instant.now().minus(30, ChronoUnit.DAYS);

        for (Inventory inventory : inventories) {
            Long warehouseId = inventory.getWarehouse().getId();
            Long productId = inventory.getProduct().getId();

            Long sum = receiptDetailRepository.sumOutboundQuantitySince(warehouseId, productId, since);
            Double dailyVelocity = sum / 30.0;
            inventory.setDailyVelocity(dailyVelocity);

            Long estimatedDaysLeft = null;
            if (dailyVelocity > 0) {
                estimatedDaysLeft = (long) (inventory.getQuantity() / dailyVelocity);
            }
            inventory.setEstimatedDaysLeft(estimatedDaysLeft);
            
            inventoryRepository.save(inventory);

            Long warningDays = inventory.getOutOfStockWarningDays() != null ? inventory.getOutOfStockWarningDays() : 3L;

            if (estimatedDaysLeft != null && estimatedDaysLeft <= warningDays) {
                String productCode = inventory.getProduct().getCode();
                String title = "Velocity Warning — " + productCode;

                List<User> users = userRepository.findByWarehouseId(warehouseId);
                for (User user : users) {
                    String role = user.getRole().getRoleName().name();
                    if (role.equals("WAREHOUSE_MANAGER") || role.equals("MANAGER") || role.equals("ADMIN")) {
                        if (!notificationRepository.existsByUserIdAndTitleContainingAndIsReadFalse(user.getId(), title)) {
                            Notification notification = Notification.builder()
                                    .user(user)
                                    .title(title)
                                    .message("Product " + productCode + " in warehouse " + inventory.getWarehouse().getWarehouseName() + " is estimated to run out in " + estimatedDaysLeft + " days.")
                                    .type("WARNING")
                                    .isRead(false)
                                    .build();
                            notificationRepository.save(notification);
                        }
                    }
                }
            }
        }
        log.info("Finished VelocityAnalyzerJob.");
    }
}
