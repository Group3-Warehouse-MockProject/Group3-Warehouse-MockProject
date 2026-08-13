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
           "LEFT JOIN FETCH r.supplier " +
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
           "LEFT JOIN FETCH r.supplier " +
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
    @Query("SELECT COUNT(r) FROM WarehouseReceipt r WHERE r.status = com.fpt.sccw.entity.Status.ReceiptStatus.PENDING AND (:warehouseId IS NULL OR r.warehouse.id = :warehouseId)")
    long countPending(@Param("warehouseId") Long warehouseId);

    @Query(value = "SELECT DISTINCT r FROM WarehouseReceipt r " +
           "LEFT JOIN FETCH r.user " +
           "LEFT JOIN FETCH r.assignedUser " +
           "LEFT JOIN FETCH r.warehouse " +
           "LEFT JOIN FETCH r.supplier " +
           "WHERE (:warehouseId IS NULL OR r.warehouse.id = :warehouseId) " +
           "AND r.createdAt >= :since " +
           "ORDER BY r.createdAt DESC",
           countQuery = "SELECT COUNT(r) FROM WarehouseReceipt r WHERE (:warehouseId IS NULL OR r.warehouse.id = :warehouseId) AND r.createdAt >= :since")
    Page<WarehouseReceipt> findRecentWithBasicJoins(@Param("warehouseId") Long warehouseId, @Param("since") java.time.LocalDateTime since, Pageable pageable);

    @Query("SELECT FUNCTION('DAYNAME', r.createdAt), r.type, COALESCE(SUM(d.quantity), 0) FROM WarehouseReceipt r JOIN r.details d WHERE r.createdAt >= :since AND (:warehouseId IS NULL OR r.warehouse.id = :warehouseId) GROUP BY FUNCTION('DAYNAME', r.createdAt), FUNCTION('DAYOFWEEK', r.createdAt), r.type ORDER BY FUNCTION('DAYOFWEEK', r.createdAt)")
    List<Object[]> aggregateWeeklyFlow(@Param("warehouseId") Long warehouseId, @Param("since") java.time.LocalDateTime since);
}
