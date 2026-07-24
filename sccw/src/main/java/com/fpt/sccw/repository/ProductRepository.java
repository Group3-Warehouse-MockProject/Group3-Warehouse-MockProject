package com.fpt.sccw.repository;

import java.util.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.fpt.sccw.entity.Product;

public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByNameContainingIgnoreCase(String name);
    List<Product> findByCategoryId(Long categoryId);
    List<Product> findBySupplierId(Long supplierId);
    boolean existsByName(String name);
    boolean existsByCode(String code);
    List<Product> findByIsDeletedTrue();
    Optional<Product> findByCode(String code);
    Optional<Product> findByName(String name);

    // ── Legacy (kept for compatibility) ──────────────────────────────────────
    List<Product> findByIsDeletedFalse();
    org.springframework.data.domain.Page<Product> findByIsDeletedFalse(org.springframework.data.domain.Pageable pageable);

    // ── Eager-load category + supplier in a single query ─────────────────────
    @Query("SELECT p FROM Product p " +
           "LEFT JOIN FETCH p.category " +
           "LEFT JOIN FETCH p.supplier " +
           "WHERE p.isDeleted = false")
    List<Product> findAllActiveWithDetails();

    /**
     * Fetch one page of active products together with their inventories
     * (and each inventory's warehouse + location) in the fewest SQL statements.
     *
     * NOTE: JOIN FETCH with Pageable requires a separate countQuery to avoid
     *       Hibernate's in-memory pagination warning.
     */
    @Query(value =
           "SELECT DISTINCT p FROM Product p " +
           "LEFT JOIN FETCH p.category " +
           "LEFT JOIN FETCH p.supplier " +
           "LEFT JOIN FETCH p.inventories inv " +
           "LEFT JOIN FETCH inv.warehouse " +
           "LEFT JOIN FETCH inv.location " +
           "WHERE p.isDeleted = false " +
           "AND (:warehouseId IS NULL OR inv.warehouse.id = :warehouseId OR inv IS NULL)",
           countQuery =
           "SELECT COUNT(DISTINCT p) FROM Product p " +
           "LEFT JOIN p.inventories inv " +
           "WHERE p.isDeleted = false " +
           "AND (:warehouseId IS NULL OR inv.warehouse.id = :warehouseId OR inv IS NULL)")
    Page<Product> findPageActiveWithInventory(@Param("warehouseId") Long warehouseId, Pageable pageable);

    /**
     * Same as above but scoped to a specific warehouse (no null check needed).
     */
    @Query(value =
           "SELECT DISTINCT p FROM Product p " +
           "LEFT JOIN FETCH p.category " +
           "LEFT JOIN FETCH p.supplier " +
           "LEFT JOIN FETCH p.inventories inv " +
           "LEFT JOIN FETCH inv.warehouse " +
           "LEFT JOIN FETCH inv.location " +
           "WHERE p.isDeleted = false",
           countQuery = "SELECT COUNT(DISTINCT p) FROM Product p WHERE p.isDeleted = false")
    Page<Product> findPageActiveWithInventoryAll(Pageable pageable);
}