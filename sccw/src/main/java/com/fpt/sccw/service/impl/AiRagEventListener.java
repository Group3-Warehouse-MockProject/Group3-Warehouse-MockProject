package com.fpt.sccw.service.impl;

import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

import com.fpt.sccw.entity.InventoryChangedEvent;
import com.fpt.sccw.service.AiRagService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Lắng nghe sự kiện thay đổi Inventory và tự động re-ingest vào Vector Store.
 * Chạy async để không chặn request chính (@EnableAsync đã có trong SccwApplication).
 */
@Component
@ConditionalOnProperty(name = "app.ai.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class AiRagEventListener {

    private final AiRagService aiRagService;

    @Async
    @EventListener
    public void onInventoryChanged(InventoryChangedEvent event) {
        Long inventoryId = event.getInventoryId();
        log.info("Inventory changed (id={}), triggering re-ingest into vector store...", inventoryId);
        // Gọi method mới — logic build description nằm trong AiRagServiceImpl, không bị duplicate
        aiRagService.ingestInventoryById(inventoryId);
    }
}
