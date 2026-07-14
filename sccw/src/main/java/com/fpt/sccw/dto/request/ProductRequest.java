package com.fpt.sccw.dto.request;

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
    private String code;
    private String name;
    private String imgProduct;
    private String specification;
    private BigDecimal cost;
    private BigDecimal price;
    private String imageUrl;
    private Long categoryId;
    private Long supplierId;
    
    // Inventory fields
    private Long warehouseId;
    private Long initialStock;
    private Long reorderPoint;
    private Long locationId;
}
