package com.fpt.sccw.dto.response;

import com.fpt.sccw.entity.ApprovalHistory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApprovalHistoryDTO {
    private Long id;
    private String documentType;
    private String oldStatus;
    private String newStatus;
    private String note;
    private Long approverId;
    private String approverName;
    private String createdAt;

    public static ApprovalHistoryDTO fromEntity(ApprovalHistory history) {
        if (history == null) return null;
        
        return ApprovalHistoryDTO.builder()
                .id(history.getId())
                .documentType(history.getDocumentType() != null ? history.getDocumentType().name() : null)
                .oldStatus(history.getOldStatus())
                .newStatus(history.getNewStatus())
                .note(history.getNote())
                .approverId(history.getApprover() != null ? history.getApprover().getId() : null)
                .approverName(history.getApprover() != null ? history.getApprover().getFullName() : null)
                .createdAt(history.getCreatedAt() != null ? history.getCreatedAt().toString() : null)
                .build();
    }
}
