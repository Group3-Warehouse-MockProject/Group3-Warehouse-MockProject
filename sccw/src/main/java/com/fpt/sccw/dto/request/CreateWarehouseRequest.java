package com.fpt.sccw.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateWarehouseRequest {

    @NotBlank(message = "Warehouse code is required")
    private String code;

    @NotBlank(message = "Warehouse name is required")
    private String name;

    @NotBlank(message = "Address is required")
    private String address;

    @NotNull(message = "Capacity is required")
    @Min(value = 0, message = "Capacity must be >= 0")
    private Long capacity;

    /** Optional — ID của User có role WAREHOUSE_MANAGER được gán vào kho này */
    private Long managerId;

    /** Optional — ghi chú */
    private String notes;
}

