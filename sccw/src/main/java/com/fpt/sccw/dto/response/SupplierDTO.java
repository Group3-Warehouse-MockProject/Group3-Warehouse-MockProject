package com.fpt.sccw.dto.response;

import com.fpt.sccw.entity.Supplier;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SupplierDTO {
    private Long id;
    private String name;
    private String email;
    private String phoneNumber;
    private String address;
    private String status;
    private String country;

    public static SupplierDTO fromEntity(Supplier supplier) {
        return SupplierDTO.builder()
                .id(supplier.getId())
                .name(supplier.getName())
                .email(supplier.getEmail())
                .phoneNumber(supplier.getPhoneNumber())
                .address(supplier.getAddress())
                .status(supplier.getStatus())
                .country(supplier.getCountry())
                .build();
    }
}