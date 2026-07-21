package com.fpt.sccw.dto.response;

import com.fpt.sccw.entity.Supplier;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

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
    private BigDecimal rating;         
    private Integer onTimeDelivery; 

    public static SupplierDTO fromEntity(Supplier supplier) {
        return SupplierDTO.builder()
                .id(supplier.getId())
                .name(supplier.getName())
                .email(supplier.getEmail())
                .phoneNumber(supplier.getPhoneNumber())
                .address(supplier.getAddress())
                .status(supplier.getStatus())
                .country(supplier.getCountry())
                .rating(supplier.getRating() != null ? supplier.getRating() : BigDecimal.ZERO)             
                .onTimeDelivery(supplier.getOnTimeDelivery() != null ? supplier.getOnTimeDelivery() : 0) 
                .build();
    }
}