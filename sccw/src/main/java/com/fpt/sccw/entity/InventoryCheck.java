package com.fpt.sccw.entity;

import java.util.*;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "inventory_checks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryCheck extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private Status.InventoryCheckStatus status = Status.InventoryCheckStatus.PENDING;

    @Column(name = "remark", columnDefinition = "TEXT")
    private String remark;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "warehouse_id", nullable = false)
    private Warehouse warehouse;

    // Nhân viên được giao thực hiện đếm (có thể null nếu chưa assign)
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "assigned_user_id", nullable = true)
    private User assignedUser;

    @OneToMany(mappedBy = "inventoryCheck", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @Builder.Default
    private List<InventoryCheckDetail> details = new ArrayList<>();

    @OneToMany(mappedBy = "inventoryCheck", fetch = FetchType.LAZY, cascade = CascadeType.ALL)
    @Builder.Default
    private List<ApprovalHistory> approvalHistories = new ArrayList<>();

}
