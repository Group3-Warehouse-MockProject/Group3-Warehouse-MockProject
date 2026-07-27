package com.fpt.sccw.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.fpt.sccw.entity.Inventory;
import java.util.List;
import java.util.Optional;

public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    // ── Legacy ───────────────────────────────────────────────────────────────
    List<Inventory> findByWarehouseId(Long warehouseId);
    Page<Inventory> findByWarehouseId(Long warehouseId, Pageable pageable);
    Optional<Inventory> findByWarehouseIdAndProductId(Long warehouseId, Long productId);
    Optional<Inventory> findByProductIdAndWarehouseId(Long productId, Long warehouseId);

    /**
     * Fetch all inventory rows for a warehouse, eagerly loading product → category,
     * supplier, warehouse, and location in a single query.
     * Fixes the N+1 problem in InventoryController.
     */
    @Query("SELECT i FROM Inventory i " +
           "LEFT JOIN FETCH i.product p " +
           "LEFT JOIN FETCH p.category " +
           "LEFT JOIN FETCH p.supplier " +
           "LEFT JOIN FETCH i.warehouse " +
           "LEFT JOIN FETCH i.location " +
           "WHERE i.warehouse.id = :warehouseId")
    List<Inventory> findByWarehouseIdEager(@Param("warehouseId") Long warehouseId);

    /**
     * Same as above but fetches ALL warehouses – used by Admin / Manager
     * when no warehouseId filter is active.
     */
    @Query("SELECT i FROM Inventory i " +
           "LEFT JOIN FETCH i.product p " +
           "LEFT JOIN FETCH p.category " +
           "LEFT JOIN FETCH p.supplier " +
           "LEFT JOIN FETCH i.warehouse " +
           "LEFT JOIN FETCH i.location")
    List<Inventory> findAllEager();

    /**
     * Pageable variant for Admin / Manager – uses separate countQuery to avoid
     * Hibernate's HHH90003004 in-memory pagination warning.
     */
    @Query(value =
           "SELECT i FROM Inventory i " +
           "LEFT JOIN FETCH i.product p " +
           "LEFT JOIN FETCH p.category " +
           "LEFT JOIN FETCH p.supplier " +
           "LEFT JOIN FETCH i.warehouse " +
           "LEFT JOIN FETCH i.location",
           countQuery = "SELECT COUNT(i) FROM Inventory i")
    Page<Inventory> findAllEagerPaged(Pageable pageable);

    /**
     * Pageable variant scoped to a warehouse.
     */
    @Query(value =
           "SELECT i FROM Inventory i " +
           "LEFT JOIN FETCH i.product p " +
           "LEFT JOIN FETCH p.category " +
           "LEFT JOIN FETCH p.supplier " +
           "LEFT JOIN FETCH i.warehouse " +
           "LEFT JOIN FETCH i.location " +
           "WHERE i.warehouse.id = :warehouseId",
           countQuery = "SELECT COUNT(i) FROM Inventory i WHERE i.warehouse.id = :warehouseId")
    Page<Inventory> findByWarehouseIdEagerPaged(@Param("warehouseId") Long warehouseId, Pageable pageable);
}
