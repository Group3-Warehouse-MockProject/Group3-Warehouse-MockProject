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
}
