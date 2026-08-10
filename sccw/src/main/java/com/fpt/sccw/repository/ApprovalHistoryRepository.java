package com.fpt.sccw.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.fpt.sccw.entity.ApprovalHistory;
import com.fpt.sccw.entity.Status;

@Repository
public interface ApprovalHistoryRepository extends JpaRepository<ApprovalHistory, Long> {

    List<ApprovalHistory> findByDocumentIdAndDocumentTypeOrderByCreatedAtAsc(
            Long documentId, Status.DocumentType documentType
    );

    @Modifying
    @Query("DELETE FROM ApprovalHistory h WHERE h.documentId = :documentId AND h.documentType = :documentType")
    void deleteByDocumentIdAndDocumentType(
            @Param("documentId") Long documentId,
            @Param("documentType") Status.DocumentType documentType
    );
}
