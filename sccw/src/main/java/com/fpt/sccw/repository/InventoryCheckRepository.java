package com.fpt.sccw.repository;

import com.fpt.sccw.entity.InventoryCheck;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InventoryCheckRepository extends JpaRepository<InventoryCheck, Long> {

    // Lấy phiếu theo kho (dùng cho Staff / Warehouse_Manager)
    List<InventoryCheck> findByWarehouseId(Long warehouseId);
    Page<InventoryCheck> findByWarehouseId(Long warehouseId, Pageable pageable);

    // Lấy phiếu theo người tạo
    List<InventoryCheck> findByUserId(Long userId);
}
