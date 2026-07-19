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
    private Long usedCapacity;
    /** Tên Warehouse Manager đang phụ trách kho này (nullable) */
    private String managerName;

    /** Overload đầy đủ — truyền managerName từ ngoài vào */
    public static WarehouseDTO fromEntity(Warehouse warehouse, String managerName) {
        String location = warehouse.getLocation() != null ? warehouse.getLocation() : "";
        String[] parts = location.split(",");
        String city = parts.length > 0 ? parts[parts.length - 1].trim() : "";

        long used = 0L;
        if (warehouse.getInventories() != null) {
            used = warehouse.getInventories().stream()
                    .mapToLong(inv -> inv.getQuantity() != null ? inv.getQuantity() : 0L)
                    .sum();
        }

        return WarehouseDTO.builder()
                .id(String.valueOf(warehouse.getId()))
                .name(warehouse.getWarehouseName())
                .code(warehouse.getCode())
                .address(location)
                .city(city)
                .capacity(warehouse.getCapacity() != null ? warehouse.getCapacity() : 0L)
                .usedCapacity(used)
                .managerName(managerName)
                .build();
    }

    /** Overload tương thích ngược — không cần managerName */
    public static WarehouseDTO fromEntity(Warehouse warehouse) {
        return fromEntity(warehouse, null);
    }
}

