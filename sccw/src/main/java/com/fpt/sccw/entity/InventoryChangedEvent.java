package com.fpt.sccw.entity;

import org.springframework.context.ApplicationEvent;

/**
 * Event được bắn ra khi Inventory thay đổi (tạo mới hoặc cập nhật số lượng).
 * AiRagEventListener sẽ lắng nghe và tự động re-ingest sản phẩm đó vào Vector Store.
 */
public class InventoryChangedEvent extends ApplicationEvent {

    private final Long inventoryId;

    public InventoryChangedEvent(Object source, Long inventoryId) {
        super(source);
        this.inventoryId = inventoryId;
    }

    public Long getInventoryId() {
        return inventoryId;
    }
}
