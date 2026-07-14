package com.fpt.sccw.repository;

import com.fpt.sccw.entity.Transfer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TransferRepository extends JpaRepository<Transfer, Long> {
    List<Transfer> findByWarehouseIdOrWarehouseDestinationId(Long warehouseId, Long warehouseDestinationId);
}
