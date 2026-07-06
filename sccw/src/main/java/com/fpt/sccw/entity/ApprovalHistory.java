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

    @Enumerated(EnumType.STRING)
    @Column(name = "old_status", nullable = false)
    private Status.TransactionStatus oldStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "new_status", nullable = false)
    private Status.TransactionStatus newStatus;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "approver_id", nullable = false)
    private User approver;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "inventory_check_id", nullable = false)
    private InventoryCheck inventoryCheck;
 
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "transfer_id", nullable = false)
    private Transfer transfer;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "warehouse_receipt_id", nullable = false)
    private WarehouseReceipt warehouseReceipt;

}
