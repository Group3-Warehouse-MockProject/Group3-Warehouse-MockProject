package com.fpt.sccw.entity;

import java.util.*;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "transfers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transfer extends BaseEntity{

    @Enumerated(EnumType.STRING)
    @Column(name = "transfer_type", nullable = false)
    private Status.TransferType transferType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private Status.TransactionStatus status = Status.TransactionStatus.PENDING;

    @Column(name = "remark", columnDefinition = "TEXT")
    private String remark;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_destination_id", nullable = true)
    private Warehouse warehouseDestination;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdByUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_by_id", nullable = true)
    private User assignedByUser;

    @OneToMany(mappedBy = "transfer", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @Builder.Default
    private List<TransferDetail> details = new ArrayList<>();

    @OneToMany(mappedBy = "transfer", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @Builder.Default
    private List<ApprovalHistory> approvalHistories = new ArrayList<>();
}
