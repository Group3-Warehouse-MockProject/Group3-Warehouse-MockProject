package com.fpt.sccw.service.impl;

import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.fpt.sccw.entity.Inventory;
import com.fpt.sccw.entity.InventoryChangedEvent;
import com.fpt.sccw.repository.InventoryRepository;
import com.fpt.sccw.service.AiRagService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Lắng nghe sự kiện thay đổi Inventory và tự động re-ingest vào Vector Store.
 * Chạy async để không chặn request chính.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AiRagEventListener {

    private final AiRagService aiRagService;
    private final InventoryRepository inventoryRepository;

    @Async
    @EventListener
    @Transactional(readOnly = true)
    public void onInventoryChanged(InventoryChangedEvent event) {
        Long inventoryId = event.getInventoryId();
        log.info("Inventory changed (id={}), re-ingesting into vector store...", inventoryId);

        inventoryRepository.findById(inventoryId).ifPresent(inv -> {
            String productId = String.valueOf(inv.getProduct().getId());
            String description = String.format(
                    "Sản phẩm: %s (mã: %s) | Danh mục: %s | Nhà cung cấp: %s | " +
                    "Giá: %s VNĐ | Thông số: %s | " +
                    "Kho: %s (%s) | Tồn kho: %d cái | Trạng thái: %s",
                    inv.getProduct().getName(),
                    inv.getProduct().getCode(),
                    inv.getProduct().getCategory() != null ? inv.getProduct().getCategory().getName() : "N/A",
                    inv.getProduct().getSupplier() != null ? inv.getProduct().getSupplier().getName() : "N/A",
                    inv.getProduct().getPrice(),
                    inv.getProduct().getSpecification(),
                    inv.getWarehouse().getWarehouseName(),
                    inv.getWarehouse().getLocation(),
                    inv.getQuantity(),
                    inv.getProduct().getStatus()
            );
            aiRagService.ingestProduct(productId, description);
            log.info("Re-ingested product {} successfully.", productId);
        });
    }
}
