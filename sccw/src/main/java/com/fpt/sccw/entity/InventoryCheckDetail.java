package com.fpt.sccw.entity;

import org.hibernate.annotations.Formula;

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

    @NotNull(message = "Actual quantity is required")
    @Min(value = 0, message = "Actual quantity cannot be negative")
    @Column(name = "actual_quantity", nullable = false)
    private Long actualQuantity;

    @NotNull(message = "System quantity is required")
    @Min(value = 0, message = "System quantity cannot be negative")
    @Column(name = "system_quantity", nullable = false)
    private Long systemQuantity;

    @Column(name = "difference", nullable = false, insertable = false, updatable = false)
    @Formula("CASE WHEN actual_quantity - system_quantity > 0 THEN actual_quantity - system_quantity ELSE system_quantity - actual_quantity END")
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
}
