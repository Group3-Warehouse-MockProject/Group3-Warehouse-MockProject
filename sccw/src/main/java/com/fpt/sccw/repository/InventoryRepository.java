package com.fpt.sccw.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.fpt.sccw.entity.Inventory;
import java.util.List;
import java.util.Optional;

public interface InventoryRepository extends JpaRepository<Inventory, Long> {
    List<Inventory> findByWarehouseId(Long warehouseId);
    Optional<Inventory> findByProductIdAndWarehouseId(Long productId, Long warehouseId);
}

