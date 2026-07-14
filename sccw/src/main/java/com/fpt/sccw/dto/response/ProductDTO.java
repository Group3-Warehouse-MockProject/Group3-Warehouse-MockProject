package com.fpt.sccw.dto.response;
import com.fpt.sccw.entity.Inventory;
import com.fpt.sccw.entity.Product;
import lombok.*;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductDTO {
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
    private String imageUrl;
    public static ProductDTO fromEntity(Product product, Inventory inventory) {
        Long stock = 0L;
        Long reorder = 0L;
        String location = "N/A";
        String wId = "";
        
        if (inventory != null) {
            stock = inventory.getQuantity();
            if (inventory.getLowStockThreshold() != null) {
                reorder = inventory.getLowStockThreshold();
            }
            if (inventory.getWarehouse() != null) {
                wId = String.valueOf(inventory.getWarehouse().getId());
            }
            if (inventory.getLocation() != null) {
                location = inventory.getLocation().getZoneCode() + "-" + 
                           inventory.getLocation().getRackCode() + "-" + 
                           inventory.getLocation().getBinCode();
            }
        }
        return ProductDTO.builder()
                .sku(product.getCode())
                .name(product.getName())
                .category(product.getCategory() != null ? product.getCategory().getName() : "")
                .brand(product.getSupplier() != null ? product.getSupplier().getName() : "")
                .stock(stock)
                .reorder(reorder)
                .price(product.getPrice())
                .cost(product.getCost())
                .location(location) 
                .warehouseId(wId)
                .imageUrl(product.getImageUrl())
                .build();
    }
}