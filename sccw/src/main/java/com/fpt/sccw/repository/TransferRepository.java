package com.fpt.sccw.repository;

import com.fpt.sccw.entity.Transfer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TransferRepository extends JpaRepository<Transfer, Long> {

    // ── Legacy (kept for compatibility) ──────────────────────────────────────
    List<Transfer> findByWarehouseIdOrWarehouseDestinationId(Long warehouseId, Long warehouseDestinationId);
    Page<Transfer> findByWarehouseIdOrWarehouseDestinationId(Long warehouseId, Long warehouseDestinationId, Pageable pageable);

    /**
     * Load all transfers with every lazy relation eagerly fetched in one query.
     * Eliminates N+1 when building TransferDTO list.
     */
    @Query("SELECT DISTINCT t FROM Transfer t " +
           "LEFT JOIN FETCH t.warehouse " +
           "LEFT JOIN FETCH t.warehouseDestination " +
           "LEFT JOIN FETCH t.createdByUser " +
           "LEFT JOIN FETCH t.assignedByUser " +
           "LEFT JOIN FETCH t.details td " +
           "LEFT JOIN FETCH td.product " +
           "ORDER BY t.createdAt DESC")
    List<Transfer> findAllEager();

    /**
     * Load transfers scoped to a warehouse (either source or destination).
     */
    @Query("SELECT DISTINCT t FROM Transfer t " +
           "LEFT JOIN FETCH t.warehouse " +
           "LEFT JOIN FETCH t.warehouseDestination " +
           "LEFT JOIN FETCH t.createdByUser " +
           "LEFT JOIN FETCH t.assignedByUser " +
           "LEFT JOIN FETCH t.details td " +
           "LEFT JOIN FETCH td.product " +
           "WHERE t.warehouse.id = :warehouseId OR t.warehouseDestination.id = :warehouseId " +
           "ORDER BY t.createdAt DESC")
    List<Transfer> findByWarehouseEager(@Param("warehouseId") Long warehouseId);

    /**
     * Pageable version – used when real server-side pagination is needed.
     * The countQuery avoids Hibernate in-memory pagination warning caused by JOIN FETCH.
     */
    @Query(value =
           "SELECT DISTINCT t FROM Transfer t " +
           "LEFT JOIN FETCH t.warehouse " +
           "LEFT JOIN FETCH t.warehouseDestination " +
           "LEFT JOIN FETCH t.createdByUser " +
           "LEFT JOIN FETCH t.assignedByUser " +
           "LEFT JOIN FETCH t.details td " +
           "LEFT JOIN FETCH td.product " +
           "WHERE t.warehouse.id = :warehouseId OR t.warehouseDestination.id = :warehouseId",
           countQuery =
           "SELECT COUNT(DISTINCT t) FROM Transfer t " +
           "WHERE t.warehouse.id = :warehouseId OR t.warehouseDestination.id = :warehouseId")
    Page<Transfer> findByWarehouseEagerPaged(@Param("warehouseId") Long warehouseId, Pageable pageable);

    @Query(value =
           "SELECT DISTINCT t FROM Transfer t " +
           "LEFT JOIN FETCH t.warehouse " +
           "LEFT JOIN FETCH t.warehouseDestination " +
           "LEFT JOIN FETCH t.createdByUser " +
           "LEFT JOIN FETCH t.assignedByUser " +
           "LEFT JOIN FETCH t.details td " +
           "LEFT JOIN FETCH td.product",
           countQuery = "SELECT COUNT(DISTINCT t) FROM Transfer t")
    Page<Transfer> findAllEagerPaged(Pageable pageable);
}
