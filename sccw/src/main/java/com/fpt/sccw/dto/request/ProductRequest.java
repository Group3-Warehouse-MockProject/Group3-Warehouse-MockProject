package com.fpt.sccw.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductRequest {
    @NotBlank(message = "SKU code is required")
    private String code;

    @NotBlank(message = "Product name is required")
    private String name;

    private String imgProduct;

    @NotBlank(message = "Specification is required")
    private String specification;

    @NotNull(message = "Cost is required")
    @DecimalMin(value = "0.0", message = "Cost cannot be negative")
    private BigDecimal cost;

    @NotNull(message = "Selling price is required")
    @DecimalMin(value = "0.0", message = "Selling price cannot be negative")
    private BigDecimal price;

    private String imageUrl;

    @NotNull(message = "Category is required")
    private Long categoryId;

    @NotNull(message = "Supplier is required")
    private Long supplierId;

    // Inventory fields
    private Long warehouseId;

    @PositiveOrZero(message = "Initial stock cannot be negative")
    private Long initialStock;

    @PositiveOrZero(message = "Reorder point cannot be negative")
    private Long reorderPoint;
    private Long locationId;
}
