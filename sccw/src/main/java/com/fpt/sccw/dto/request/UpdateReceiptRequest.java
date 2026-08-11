package com.fpt.sccw.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateReceiptRequest {
    /** PENDING | APPROVED | REJECTED — null = không đổi */
    private String status;
    /** null = không đổi */
    private String remark;
    /** New warehouse ID — null = không đổi. Only allowed when PENDING. */
    private Long warehouseId;
    /** Supplier ID — null = không đổi, -1 = clear. Only allowed when PENDING. */
    private Long supplierId;
    /** Updated line items — null = không đổi. Only allowed when PENDING. */
    private java.util.List<CreateReceiptRequest.LineItemRequest> items;
    /** Assigned user id — null = không đổi, -1 = unassign */
    private Long assignedUserId;
}
