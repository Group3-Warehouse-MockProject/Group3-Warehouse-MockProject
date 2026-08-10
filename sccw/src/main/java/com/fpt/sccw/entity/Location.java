package com.fpt.sccw.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "locations", uniqueConstraints = {
    @UniqueConstraint(name = "uk_location_warehouse_rack_bin", columnNames = {"warehouse_id", "rack_code", "bin_code"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Location extends BaseEntity {

    @Column(name = "rack_code")
    private String rackCode;

    @Column(name = "bin_code")
    private String binCode;

    @Column(name = "status")
    private String status;
    
    @Column(name = "max_capacity")
    private Long maxCapacity;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "warehouse_id")
    private Warehouse warehouse;

    @OneToMany(mappedBy = "location", fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @Builder.Default
    private java.util.List<Inventory> inventories = new java.util.ArrayList<>();
}
