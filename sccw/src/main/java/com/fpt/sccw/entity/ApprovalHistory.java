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

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "approver_id", nullable = false)
    private User approver;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "inventory_check_id")
    private InventoryCheck inventoryCheck;
 
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "transfer_id")
    private Transfer transfer;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "warehouse_receipt_id")
    private WarehouseReceipt warehouseReceipt;

}
