package com.fpt.sccw.entity;

import java.util.*;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Entity
@Table(name = "warehouses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Warehouse extends BaseEntity{

    @NotBlank(message = "Warehouse code is required")
    @Column(name = "warehouse_code", nullable = false, unique = true)
    private String code;
    
    @NotBlank(message = "Warehouse name is required")
    @Column(name = "warehouse_name", nullable = false)
    private String warehouseName;

    @NotBlank(message = "Location is required")
    @Column(name = "location", nullable = false)
    private String location;

    @OneToMany(mappedBy = "warehouse", fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @Builder.Default
    private List<WarehouseReceipt> receipts = new ArrayList<>();

    @OneToMany(mappedBy = "warehouse", fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @Builder.Default
    private List<Inventory> inventories = new ArrayList<>();

    @OneToMany(mappedBy = "warehouse", fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @Builder.Default
    private List<User> managers = new ArrayList<>();

    @OneToMany(mappedBy = "warehouse", fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @Builder.Default
    private List<Transfer> transfers = new ArrayList<>();

    @OneToMany(mappedBy = "warehouseDestination", fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @Builder.Default
    private List<Transfer> incomingTransfers = new ArrayList<>();

    @OneToMany(mappedBy = "warehouse", fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @Builder.Default
    private List<InventoryCheck> inventoryChecks = new ArrayList<>();

}
