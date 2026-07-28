package com.fpt.sccw.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Table(name = "inventory_check_details")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryCheckDetail extends BaseEntity {

    @Min(value = 0, message = "Actual quantity cannot be negative")
    @Column(name = "actual_quantity", nullable = true)
    private Long actualQuantity;

    @NotNull(message = "System quantity is required")
    @Min(value = 0, message = "System quantity cannot be negative")
    @Column(name = "system_quantity", nullable = false)
    private Long systemQuantity;

    @Column(name = "difference", nullable = false)
    @Builder.Default
    private Long difference = 0L;

    @Column(name = "remark", columnDefinition = "TEXT")
    private String remark;
    
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "inventory_check_id", nullable = false)
    private InventoryCheck inventoryCheck;

    @PrePersist
    @PreUpdate
    public void calculateDifference() {
        if (this.actualQuantity != null && this.systemQuantity != null) {
            this.difference = Math.abs(this.actualQuantity - this.systemQuantity);
        } else {
            this.difference = 0L;
        }
    }
}
