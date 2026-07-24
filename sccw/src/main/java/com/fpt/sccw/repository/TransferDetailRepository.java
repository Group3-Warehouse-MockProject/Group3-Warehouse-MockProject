package com.fpt.sccw.repository;

import com.fpt.sccw.entity.TransferDetail;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TransferDetailRepository extends JpaRepository<TransferDetail, Long> {

    @Query(value = "SELECT d FROM TransferDetail d " +
            "JOIN FETCH d.transfer t " +
            "JOIN FETCH d.product " +
            "LEFT JOIN FETCH t.warehouse " +
            "LEFT JOIN FETCH t.warehouseDestination " +
            "LEFT JOIN FETCH t.createdByUser " +
            "WHERE (:warehouseId IS NULL OR t.warehouse.id = :warehouseId OR t.warehouseDestination.id = :warehouseId)",
            countQuery = "SELECT COUNT(d) FROM TransferDetail d JOIN d.transfer t " +
                    "WHERE (:warehouseId IS NULL OR t.warehouse.id = :warehouseId OR t.warehouseDestination.id = :warehouseId)")
    Page<TransferDetail> findMovementPage(@Param("warehouseId") Long warehouseId, Pageable pageable);
}
