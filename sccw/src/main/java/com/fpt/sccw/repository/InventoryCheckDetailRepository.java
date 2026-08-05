package com.fpt.sccw.repository;

import com.fpt.sccw.entity.InventoryCheckDetail;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryCheckDetailRepository extends JpaRepository<InventoryCheckDetail, Long> {

    boolean existsByProductId(Long productId);
}
