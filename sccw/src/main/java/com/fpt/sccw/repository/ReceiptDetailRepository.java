package com.fpt.sccw.repository;

import com.fpt.sccw.entity.ReceiptDetail;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReceiptDetailRepository extends JpaRepository<ReceiptDetail, Long> {

    boolean existsByProductId(Long productId);

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

    @Query(value = "SELECT d FROM ReceiptDetail d " +
            "JOIN FETCH d.receipt r " +
            "JOIN FETCH d.product p " +
            "LEFT JOIN FETCH p.supplier s " +
            "LEFT JOIN FETCH r.user " +
            "LEFT JOIN FETCH r.assignedUser " +
            "LEFT JOIN FETCH r.warehouse " +
            "WHERE (:warehouseId IS NULL OR r.warehouse.id = :warehouseId) " +
            "AND (:type IS NULL OR r.type = :type) " +
            "AND (:search IS NULL OR (LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(p.code) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(COALESCE(r.partner, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(COALESCE(s.name, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(CONCAT('r-', r.id)) LIKE LOWER(CONCAT('%', :search, '%')) OR CONCAT('', r.id) LIKE CONCAT('%', :search, '%') OR LOWER(COALESCE(r.user.fullName, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(COALESCE(r.assignedUser.fullName, '')) LIKE LOWER(CONCAT('%', :search, '%')))) " +
            "AND (:status IS NULL OR r.status = :status) " +
            "AND (:staffName IS NULL OR r.user.fullName = :staffName) " +
            "AND (:assignedUserName IS NULL OR r.assignedUser.fullName = :assignedUserName) " +
            "AND (:qtyMin IS NULL OR d.quantity >= :qtyMin) " +
            "AND (:qtyMax IS NULL OR d.quantity <= :qtyMax) " +
            "AND (:dateFrom IS NULL OR r.createdAt >= :dateFrom) " +
            "AND (:dateTo IS NULL OR r.createdAt <= :dateTo)",
            countQuery = "SELECT COUNT(d) FROM ReceiptDetail d JOIN d.receipt r JOIN d.product p LEFT JOIN p.supplier s LEFT JOIN r.user u LEFT JOIN r.assignedUser au " +
                    "WHERE (:warehouseId IS NULL OR r.warehouse.id = :warehouseId) " +
                    "AND (:type IS NULL OR r.type = :type) " +
                    "AND (:search IS NULL OR (LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(p.code) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(COALESCE(r.partner, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(COALESCE(s.name, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(CONCAT('r-', r.id)) LIKE LOWER(CONCAT('%', :search, '%')) OR CONCAT('', r.id) LIKE CONCAT('%', :search, '%') OR LOWER(COALESCE(u.fullName, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(COALESCE(au.fullName, '')) LIKE LOWER(CONCAT('%', :search, '%')))) " +
                    "AND (:status IS NULL OR r.status = :status) " +
                    "AND (:staffName IS NULL OR u.fullName = :staffName) " +
                    "AND (:assignedUserName IS NULL OR au.fullName = :assignedUserName) " +
                    "AND (:qtyMin IS NULL OR d.quantity >= :qtyMin) " +
                    "AND (:qtyMax IS NULL OR d.quantity <= :qtyMax) " +
                    "AND (:dateFrom IS NULL OR r.createdAt >= :dateFrom) " +
                    "AND (:dateTo IS NULL OR r.createdAt <= :dateTo)")
    Page<ReceiptDetail> findMovementPageFiltered(@Param("warehouseId") Long warehouseId,
                                                 @Param("type") com.fpt.sccw.entity.Status.TransactionType type,
                                                 @Param("search") String search,
                                                 @Param("status") com.fpt.sccw.entity.Status.ReceiptStatus status,
                                                 @Param("staffName") String staffName,
                                                 @Param("assignedUserName") String assignedUserName,
                                                 @Param("qtyMin") Long qtyMin,
                                                 @Param("qtyMax") Long qtyMax,
                                                 @Param("dateFrom") java.time.LocalDateTime dateFrom,
                                                 @Param("dateTo") java.time.LocalDateTime dateTo,
                                                 Pageable pageable);

    @Query("SELECT COALESCE(SUM(d.quantity), 0) FROM ReceiptDetail d JOIN d.receipt r " +
           "WHERE r.warehouse.id = :warehouseId AND d.product.id = :productId " +
           "AND r.type = com.fpt.sccw.entity.Status.TransactionType.OUTBOUND " +
           "AND r.status = com.fpt.sccw.entity.Status.ReceiptStatus.COMPLETED " +
           "AND r.createdAt >= :since")
    Long sumOutboundQuantitySince(@Param("warehouseId") Long warehouseId, @Param("productId") Long productId, @Param("since") java.time.Instant since);

    @Query(value = "SELECT d FROM ReceiptDetail d " +
            "JOIN FETCH d.receipt r " +
            "JOIN FETCH d.product p " +
            "LEFT JOIN FETCH p.supplier " +
            "LEFT JOIN FETCH r.user " +
            "LEFT JOIN FETCH r.assignedUser " +
            "LEFT JOIN FETCH r.warehouse " +
            "WHERE (:warehouseId IS NULL OR r.warehouse.id = :warehouseId) " +
            "AND (:type IS NULL OR r.type = :type) " +
            "AND (:search IS NULL OR (LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(p.code) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(COALESCE(r.partner, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(CONCAT('r-', r.id)) LIKE LOWER(CONCAT('%', :search, '%')) OR CONCAT('', r.id) LIKE CONCAT('%', :search, '%') OR LOWER(COALESCE(r.user.fullName, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(COALESCE(r.assignedUser.fullName, '')) LIKE LOWER(CONCAT('%', :search, '%')))) " +
            "AND (:status IS NULL OR r.status = :status) " +
            "AND (:staffName IS NULL OR r.user.fullName = :staffName) " +
            "AND (:assignedUserName IS NULL OR r.assignedUser.fullName = :assignedUserName) " +
            "AND (:qtyMin IS NULL OR d.quantity >= :qtyMin) " +
            "AND (:qtyMax IS NULL OR d.quantity <= :qtyMax) " +
            "AND (:dateFrom IS NULL OR r.createdAt >= :dateFrom) " +
            "AND (:dateTo IS NULL OR r.createdAt <= :dateTo)")
    java.util.List<ReceiptDetail> findAllMovementsFiltered(@Param("warehouseId") Long warehouseId,
                                                           @Param("type") com.fpt.sccw.entity.Status.TransactionType type,
                                                           @Param("search") String search,
                                                           @Param("status") com.fpt.sccw.entity.Status.ReceiptStatus status,
                                                           @Param("staffName") String staffName,
                                                           @Param("assignedUserName") String assignedUserName,
                                                           @Param("qtyMin") Long qtyMin,
                                                           @Param("qtyMax") Long qtyMax,
                                                           @Param("dateFrom") java.time.LocalDateTime dateFrom,
                                                           @Param("dateTo") java.time.LocalDateTime dateTo);
}

