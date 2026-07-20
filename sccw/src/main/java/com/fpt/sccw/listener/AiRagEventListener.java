package com.fpt.sccw.listener;

import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import com.fpt.sccw.event.InventoryChangedEvent;
import com.fpt.sccw.service.AiRagService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Lắng nghe sự kiện thay đổi Inventory và tự động re-ingest vào Vector Store.
 * Chạy async để không chặn request chính (@EnableAsync đã có trong SccwApplication).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AiRagEventListener {

    private final AiRagService aiRagService;

    @Async
    @EventListener
    public void onInventoryChanged(InventoryChangedEvent event) {
        Long inventoryId = event.getInventoryId();
        log.info("Inventory changed (id={}), triggering re-ingest into vector store...", inventoryId);
        aiRagService.ingestInventoryById(inventoryId);
    }
}
