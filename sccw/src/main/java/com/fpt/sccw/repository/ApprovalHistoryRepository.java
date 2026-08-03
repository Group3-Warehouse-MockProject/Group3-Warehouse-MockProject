package com.fpt.sccw.repository;

import com.fpt.sccw.entity.ApprovalHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApprovalHistoryRepository extends JpaRepository<ApprovalHistory, Long> {
    List<ApprovalHistory> findByInventoryCheckIdOrderByCreatedAtAsc(Long inventoryCheckId);
    List<ApprovalHistory> findByTransferIdOrderByCreatedAtAsc(Long transferId);
    List<ApprovalHistory> findByWarehouseReceiptIdOrderByCreatedAtAsc(Long warehouseReceiptId);

    @Modifying
    @Query("DELETE FROM ApprovalHistory h WHERE h.transfer.id = :transferId")
    void deleteByTransferId(@Param("transferId") Long transferId);
}
