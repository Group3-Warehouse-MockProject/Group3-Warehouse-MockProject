package com.fpt.sccw.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReceiptStatsDTO {
    private long totalReceipts;
    private long totalUnits;
    private long totalPartners;
    private BigDecimal totalRevenue;
    private long pendingRequests;
    private long approvedRequests;
}
