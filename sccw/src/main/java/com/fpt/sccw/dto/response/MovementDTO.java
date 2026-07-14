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
    private String type; // "Inbound" or "Outbound"
    private String product;
    private String partner; // Supplier name or Destination Warehouse
    private String staff;
    private String warehouseId;
    private Long qty;
    private String date;
}
