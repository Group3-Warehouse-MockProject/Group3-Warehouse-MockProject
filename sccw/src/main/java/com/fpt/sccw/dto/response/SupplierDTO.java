package com.fpt.sccw.dto.response;

import com.fpt.sccw.entity.Supplier;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SupplierDTO {
    private Long id;
    private String name;

    public static SupplierDTO fromEntity(Supplier supplier) {
        return SupplierDTO.builder()
                .id(supplier.getId())
                .name(supplier.getName())
                .build();
    }
}
