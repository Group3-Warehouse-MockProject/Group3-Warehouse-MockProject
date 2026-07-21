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
}
