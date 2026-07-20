package com.fpt.sccw.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateWarehouseRequest {

    @NotBlank(message = "Warehouse name is required")
    private String name;

    @NotBlank(message = "Address is required")
    private String address;

    @NotNull(message = "Capacity is required")
    @Min(value = 0, message = "Capacity must be >= 0")
    private Long capacity;

    private String status;

    /**
     * Optional — ID của User có role WAREHOUSE_MANAGER.
     * - Nếu null → giữ nguyên manager hiện tại.
     * - Nếu -1L  → bỏ gán manager (unassign).
     * - Nếu > 0  → gán manager mới.
     */
    private Long managerId;
}
