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
    private String status;
    /** Tên Warehouse Manager đang phụ trách kho này (nullable) */
    private String managerName;

    /** Overload đầy đủ — truyền managerName từ ngoài vào */
    public static WarehouseDTO fromEntity(Warehouse warehouse, String managerName) {
        String location = warehouse.getLocation() != null ? warehouse.getLocation() : "";
        String[] parts = location.split(",");

        // city = phần cuối (sau dấu phẩy cuối cùng)
        String city = parts.length > 0 ? parts[parts.length - 1].trim() : "";

        // address = tất cả các phần trừ city (không lặp city trong address)
        String streetAddr = parts.length > 1
                ? String.join(",", java.util.Arrays.copyOfRange(parts, 0, parts.length - 1)).trim()
                : location;

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
                .address(streetAddr)
                .city(city)
                .capacity(warehouse.getCapacity() != null ? warehouse.getCapacity() : 0L)
                .usedCapacity(used)
                .status(warehouse.getStatus() != null ? warehouse.getStatus() : "ACTIVE")
                .managerName(managerName)
                .build();
    }

    /** Overload tương thích ngược — không cần managerName */
    public static WarehouseDTO fromEntity(Warehouse warehouse) {
        return fromEntity(warehouse, null);
    }
}

