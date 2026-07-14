package com.fpt.sccw.dto.request;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransferRequest {
    private String type;
    private Long sourceWarehouseId;
    private Long destinationWarehouseId;
    private Long assignedById;
    private String sourceLocation;
    private String destinationLocation;
    private String remark;
    private List<TransferLineRequest> lines;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TransferLineRequest {
        private String sku;
        private Long quantity;
    }
}
