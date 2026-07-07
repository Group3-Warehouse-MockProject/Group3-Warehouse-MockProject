package com.fpt.sccw.dto.response;

import com.fpt.sccw.entity.Inventory;
import lombok.*;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryDTO {
    private String sku;
    private String name;
    private String category;
    private String brand;
    private Long stock;
    private Integer reorder; // Could be from product if it exists
    private BigDecimal price;
    private BigDecimal cost; // Could be from product if it exists
    private String location; // From somewhere
    private String warehouseId;

    public static InventoryDTO fromEntity(Inventory inventory) {
        return InventoryDTO.builder()
                .sku(inventory.getProduct().getCode())
                .name(inventory.getProduct().getName())
                .category(inventory.getProduct().getCategory().getName())
                .brand(inventory.getProduct().getSupplier().getName()) // Approx map
                .stock(inventory.getQuantity())
                .reorder(20) // Mock
                .price(inventory.getProduct().getPrice())
                .cost(inventory.getProduct().getPrice().multiply(new BigDecimal("0.8"))) // Mock
                .location("A-01-01") // Mock location
                .warehouseId(String.valueOf(inventory.getWarehouse().getId())) // Must match activeWarehouseId from JWT
                .build();
    }
}
