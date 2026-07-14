package com.fpt.sccw.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "locations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Location extends BaseEntity {
    
    @Column(name = "zone_code")
    private String zoneCode;

    @Column(name = "rack_code")
    private String rackCode;

    @Column(name = "bin_code")
    private String binCode;

    @Column(name = "status")
    private String status;
    
    @Column(name = "max_capacity")
    private Long maxCapacity;

    @OneToMany(mappedBy = "location", fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @Builder.Default
    private java.util.List<Inventory> inventories = new java.util.ArrayList<>();
}
