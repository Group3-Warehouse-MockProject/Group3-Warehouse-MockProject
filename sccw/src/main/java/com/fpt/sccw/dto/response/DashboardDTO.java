package com.fpt.sccw.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardDTO {
    private List<MovementDTO> movements;
    private List<WeeklyFlowDTO> weeklyFlow;
    private Long pendingOrders;
    private Long totalSKUs;
    private Long totalUnits;
    private java.math.BigDecimal inventoryValue;
    private Long lowStockCount;
    private java.util.List<CategoryShareDTO> categoryShare;
}
