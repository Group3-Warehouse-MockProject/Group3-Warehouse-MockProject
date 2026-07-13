package com.fpt.sccw.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.fpt.sccw.entity.Inventory;
import java.util.List;

public interface InventoryRepository extends JpaRepository<Inventory, Long> {
    List<Inventory> findByWarehouseId(Long warehouseId);
}
