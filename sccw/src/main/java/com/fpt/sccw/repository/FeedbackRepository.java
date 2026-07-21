package com.fpt.sccw.repository;

import com.fpt.sccw.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    List<Feedback> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Feedback> findByUserWarehouseIdOrderByCreatedAtDesc(Long warehouseId);
    List<Feedback> findAllByOrderByCreatedAtDesc();
}
