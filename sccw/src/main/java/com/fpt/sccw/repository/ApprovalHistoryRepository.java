package com.fpt.sccw.repository;

import com.fpt.sccw.entity.ApprovalHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApprovalHistoryRepository extends JpaRepository<ApprovalHistory, Long> {
    List<ApprovalHistory> findByDocumentIdAndDocumentTypeOrderByCreatedAtAsc(Long documentId, com.fpt.sccw.entity.Status.DocumentType documentType);
}
