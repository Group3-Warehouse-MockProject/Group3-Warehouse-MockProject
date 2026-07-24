package com.fpt.sccw.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MovementDTO {
    private String id;
    private Long receiptId;          // ID của WarehouseReceipt cha
    private String type;             // "Inbound" or "Outbound"
    private String sku;              // Product code
    private String product;
    private String partner;          // Supplier name or destination
    private String staff;            // fullName of creator
    private String warehouseId;
    private Long qty;
    private String date;             // yyyy-MM-dd
    private String status;           // PENDING | APPROVED | REJECTED
    private String remark;           // ghi chú receipt
    private String createdAt;        // yyyy-MM-dd HH:mm
    private String updatedAt;        // yyyy-MM-dd HH:mm

    // Payment info
    private String paymentTerm;      // PREPAID | COD | DEBT
    private String paymentStatus;    // UNPAID | PARTIAL | PAID
    private java.math.BigDecimal totalAmount;
    private java.math.BigDecimal paidAmount;
}

