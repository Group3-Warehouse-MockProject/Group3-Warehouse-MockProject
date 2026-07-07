package com.fpt.sccw.dto.response;

import com.fpt.sccw.entity.Warehouse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WarehouseDTO {
    private String id;
    private String name;
    private String code;
    private String address;
    private String city;
    private Long capacity;

    public static WarehouseDTO fromEntity(Warehouse warehouse) {
        // Parse city from location, e.g. "..., Ho Chi Minh City" -> "Ho Chi Minh City"
        String location = warehouse.getLocation() != null ? warehouse.getLocation() : "";
        String[] parts = location.split(",");
        String city = parts.length > 0 ? parts[parts.length - 1].trim() : "";

        return WarehouseDTO.builder()
                .id(String.valueOf(warehouse.getId()))
                .name(warehouse.getWarehouseName())
                .code(warehouse.getCode())
                .address(location)
                .city(city)
                .capacity(12400L) // Mock capacity for now
                .build();
    }
}
