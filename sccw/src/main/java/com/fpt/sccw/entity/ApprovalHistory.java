package com.fpt.sccw.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "approval_histories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApprovalHistory extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false)
    private Status.DocumentType documentType;

    @Column(name = "old_status")
    private String oldStatus;

    @Column(name = "new_status", nullable = false)
    private String newStatus;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "approver_id", nullable = false)
    private Long approverId;

    @Column(name = "approver_name")
    private String approverName;

    @Column(name = "document_id", nullable = false)
    private Long documentId;

}
