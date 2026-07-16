package com.fpt.sccw.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateReceiptRequest {

    /** Warehouse ID where the receipt is created */
    private Long warehouseId;

    /** "INBOUND" or "OUTBOUND" */
    private String type;

    /** Optional remark / note */
    private String remark;

    /** Line items */
    private List<LineItemRequest> items;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LineItemRequest {
        /** Product code (sku) */
        private String productCode;
        /** Quantity */
        private Long quantity;
        /** Unit price / cost */
        private BigDecimal price;
    }
}
