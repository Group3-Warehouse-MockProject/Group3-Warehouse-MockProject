package com.fpt.sccw.dto.response;

import com.fpt.sccw.entity.Inventory;
import lombok.*;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryDTO {
    private Long inventoryId;
    private Long productId;
    private String sku;
    private String name;
    private String category;
    private String brand;
    private Long stock;
    private Long reorder;
    private BigDecimal price;
    private BigDecimal cost;
    private String location;
    private String warehouseId;
    private Long outOfStockWarningDays;
    private Double dailyVelocity;
    private Long estimatedDaysLeft;

    public static InventoryDTO fromEntity(Inventory inventory) {
        String loc = "N/A";
        if (inventory.getLocation() != null) {
            loc = inventory.getLocation().getRackCode() + "-" + 
                  inventory.getLocation().getBinCode();
        }
        
        return InventoryDTO.builder()
                .inventoryId(inventory.getId())
                .productId(inventory.getProduct().getId())
                .sku(inventory.getProduct().getCode())
                .name(inventory.getProduct().getName())
                .category(inventory.getProduct().getCategory().getName())
                .brand(inventory.getProduct().getSupplier().getName()) // Approx map
                .stock(inventory.getQuantity())
                .reorder(inventory.getLowStockThreshold())
                .price(inventory.getProduct().getPrice())
                .cost(inventory.getProduct().getCost())
                .location(loc)
                .warehouseId(String.valueOf(inventory.getWarehouse().getId())) // Must match activeWarehouseId from JWT
                .outOfStockWarningDays(inventory.getOutOfStockWarningDays())
                .dailyVelocity(inventory.getDailyVelocity())
                .estimatedDaysLeft(inventory.getEstimatedDaysLeft())
                .build();
    }
}
