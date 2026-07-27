package com.fpt.sccw.repository;

import com.fpt.sccw.entity.ReceiptDetail;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReceiptDetailRepository extends JpaRepository<ReceiptDetail, Long> {

    @Query(value = "SELECT d FROM ReceiptDetail d " +
            "JOIN FETCH d.receipt r " +
            "JOIN FETCH d.product p " +
            "LEFT JOIN FETCH p.supplier " +
            "LEFT JOIN FETCH r.user " +
            "LEFT JOIN FETCH r.assignedUser " +
            "LEFT JOIN FETCH r.warehouse " +
            "WHERE (:warehouseId IS NULL OR r.warehouse.id = :warehouseId) " +
            "AND (:type IS NULL OR r.type = :type)",
            countQuery = "SELECT COUNT(d) FROM ReceiptDetail d JOIN d.receipt r " +
                    "WHERE (:warehouseId IS NULL OR r.warehouse.id = :warehouseId) " +
                    "AND (:type IS NULL OR r.type = :type)")
    Page<ReceiptDetail> findMovementPage(@Param("warehouseId") Long warehouseId,
                                         @Param("type") com.fpt.sccw.entity.Status.TransactionType type,
                                         Pageable pageable);

    @Query("SELECT COALESCE(SUM(d.quantity), 0) FROM ReceiptDetail d JOIN d.receipt r " +
           "WHERE r.warehouse.id = :warehouseId AND d.product.id = :productId " +
           "AND r.type = com.fpt.sccw.entity.Status.TransactionType.OUTBOUND " +
           "AND r.status = com.fpt.sccw.entity.Status.ReceiptStatus.COMPLETED " +
           "AND r.createdAt >= :since")
    Long sumOutboundQuantitySince(@Param("warehouseId") Long warehouseId, @Param("productId") Long productId, @Param("since") java.time.Instant since);
}
