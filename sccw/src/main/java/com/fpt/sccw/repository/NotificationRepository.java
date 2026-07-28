package com.fpt.sccw.repository;

import com.fpt.sccw.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    boolean existsByUserIdAndTitleContainingAndIsReadFalse(Long userId, String titleKeyword);

    boolean existsByUserIdAndMessageContainingAndIsReadFalse(Long userId, String messageKeyword);

    boolean existsByUserIdAndIsReadFalse(Long userId);

}
