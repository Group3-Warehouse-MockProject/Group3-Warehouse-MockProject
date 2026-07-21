package com.fpt.sccw.listener;

import com.fpt.sccw.entity.Inventory;
import com.fpt.sccw.event.InventoryChangedEvent;
import jakarta.persistence.PostPersist;
import jakarta.persistence.PostRemove;
import jakarta.persistence.PostUpdate;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.ApplicationEventPublisherAware;
import org.springframework.stereotype.Component;

/**
 * Listener lắng nghe sự thay đổi của thực thể Inventory ở tầng JPA/Hibernate.
 * Mỗi khi có bản ghi Inventory mới được tạo, cập nhật hoặc xóa,
 * listener sẽ tự động bắn ra một InventoryChangedEvent.
 */
@Component
public class InventoryListener implements ApplicationEventPublisherAware {

    private static ApplicationEventPublisher eventPublisher;

    @Override
    public void setApplicationEventPublisher(ApplicationEventPublisher applicationEventPublisher) {
        InventoryListener.eventPublisher = applicationEventPublisher;
    }

    @PostPersist
    @PostUpdate
    public void onPostPersistOrUpdate(Inventory inventory) {
        if (eventPublisher != null && inventory.getId() != null) {
            eventPublisher.publishEvent(new InventoryChangedEvent(this, inventory.getId()));
        }
    }

    @PostRemove
    public void onPostRemove(Inventory inventory) {
        if (eventPublisher != null && inventory.getId() != null) {
            eventPublisher.publishEvent(new InventoryChangedEvent(this, inventory.getId()));
        }
    }
}
