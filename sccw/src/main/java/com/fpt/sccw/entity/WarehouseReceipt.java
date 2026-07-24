package com.fpt.sccw.entity;

import java.util.*;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Table(name = "warehouse_receipts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WarehouseReceipt extends BaseEntity{

    @NotNull(message = "Receipt type is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "receipt_type", nullable = false)
    private Status.TransactionType type;
    
    @NotNull(message = "Receipt status is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "receipt_status", nullable = false)
    @Builder.Default
    private Status.ReceiptStatus status = Status.ReceiptStatus.PENDING;

    @Column(name = "remark", columnDefinition = "TEXT")
    private String remark;

    @Column(name = "partner")
    private String partner;

    @NotNull(message = "User is required")
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotNull(message = "Warehouse is required")
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "assigned_user_id")
    private User assignedUser;

    @OneToMany(mappedBy = "receipt", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @org.hibernate.annotations.BatchSize(size = 100)
    @Builder.Default
    private Set<ReceiptDetail> details = new LinkedHashSet<>();

    @OneToMany(mappedBy = "warehouseReceipt", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @org.hibernate.annotations.BatchSize(size = 100)
    @Builder.Default
    private Set<ApprovalHistory> approvalHistories = new LinkedHashSet<>();

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_term")
    @Builder.Default
    private Status.PaymentTerm paymentTerm = Status.PaymentTerm.COD;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status")
    @Builder.Default
    private Status.PaymentStatus paymentStatus = Status.PaymentStatus.UNPAID;

    @OneToMany(mappedBy = "receipt", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @org.hibernate.annotations.BatchSize(size = 100)
    @Builder.Default
    private Set<Payment> payments = new LinkedHashSet<>();
}
