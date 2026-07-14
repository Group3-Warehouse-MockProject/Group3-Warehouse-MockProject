package com.fpt.sccw.repository;

import com.fpt.sccw.entity.WarehouseReceipt;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WarehouseReceiptRepository extends JpaRepository<WarehouseReceipt, Long> {
    List<WarehouseReceipt> findByWarehouseId(Long warehouseId);
}
