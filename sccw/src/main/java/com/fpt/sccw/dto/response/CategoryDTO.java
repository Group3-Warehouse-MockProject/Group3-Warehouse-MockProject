package com.fpt.sccw.dto.response;

import com.fpt.sccw.entity.Category;
import com.fpt.sccw.entity.Inventory;
import com.fpt.sccw.entity.Product;
import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryDTO {
    private Long id;
    private String code;
    private String name;
    private String categoryGroup;
    private String description;
    private boolean isDeleted;

    // Computed stats
    private int skuCount;
    private long totalStock;
    private BigDecimal inventoryValue;

    public static CategoryDTO fromEntity(Category category) {
        List<Product> activeProducts = category.getProducts() != null
                ? category.getProducts().stream()
                    .filter(p -> !Boolean.TRUE.equals(p.getIsDeleted()))
                    .toList()
                : List.of();

        int skuCount = activeProducts.size();

        long totalStock = activeProducts.stream()
                .flatMap(p -> p.getInventories() != null ? p.getInventories().stream() : java.util.stream.Stream.empty())
                .mapToLong(Inventory::getQuantity)
                .sum();

        BigDecimal inventoryValue = activeProducts.stream()
                .flatMap(p -> p.getInventories() != null ? p.getInventories().stream() : java.util.stream.Stream.empty())
                .map(inv -> inv.getProduct().getPrice().multiply(BigDecimal.valueOf(inv.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return CategoryDTO.builder()
                .id(category.getId())
                .code(category.getCode())
                .name(category.getName())
                .categoryGroup(category.getCategoryGroup())
                .description(category.getDescription())
                .isDeleted(Boolean.TRUE.equals(category.getIsDeleted()))
                .skuCount(skuCount)
                .totalStock(totalStock)
                .inventoryValue(inventoryValue)
                .build();
    }
}
