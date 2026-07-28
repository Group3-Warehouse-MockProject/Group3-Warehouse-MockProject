package com.fpt.sccw.repository;

import com.fpt.sccw.entity.WarehouseReceipt;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface WarehouseReceiptRepository extends JpaRepository<WarehouseReceipt, Long> {

    // ── Legacy list (kept for compatibility in other controllers) ─────────────
    List<WarehouseReceipt> findByWarehouseId(Long warehouseId);
    Page<WarehouseReceipt> findByWarehouseId(Long warehouseId, Pageable pageable);

    /**
     * Fetch receipts with ALL child collections in one shot to prevent N+1.
     * details → product, payments, approvalHistories are all loaded eagerly via JOIN FETCH.
     */
    @Query("SELECT DISTINCT r FROM WarehouseReceipt r " +
           "LEFT JOIN FETCH r.user " +
           "LEFT JOIN FETCH r.assignedUser " +
           "LEFT JOIN FETCH r.warehouse " +
           "LEFT JOIN FETCH r.details d " +
           "LEFT JOIN FETCH d.product dp " +
           "LEFT JOIN FETCH dp.supplier " +
           "WHERE r.warehouse.id = :warehouseId " +
           "ORDER BY r.createdAt DESC")
    List<WarehouseReceipt> findByWarehouseIdEager(@Param("warehouseId") Long warehouseId);

    @Query("SELECT DISTINCT r FROM WarehouseReceipt r " +
           "LEFT JOIN FETCH r.user " +
           "LEFT JOIN FETCH r.assignedUser " +
           "LEFT JOIN FETCH r.warehouse " +
           "LEFT JOIN FETCH r.details d " +
           "LEFT JOIN FETCH d.product dp " +
           "LEFT JOIN FETCH dp.supplier " +
           "ORDER BY r.createdAt DESC")
    List<WarehouseReceipt> findAllEager();

    @Query("SELECT COUNT(r) > 0 FROM WarehouseReceipt r JOIN r.details d " +
           "WHERE r.type = com.fpt.sccw.entity.Status.TransactionType.INBOUND " +
           "AND r.status = com.fpt.sccw.entity.Status.ReceiptStatus.PENDING " +
           "AND r.warehouse.id = :warehouseId " +
           "AND d.product.id = :productId")
    boolean existsPendingInboundForProduct(@Param("warehouseId") Long warehouseId, @Param("productId") Long productId);
}
