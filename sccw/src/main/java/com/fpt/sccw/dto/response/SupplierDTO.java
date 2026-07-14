package com.fpt.sccw.dto.response;

import com.fpt.sccw.entity.Supplier;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.Objects;
import java.util.stream.Collectors;

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
    private String contactPerson;
    private String categories;
    private BigDecimal rating;
    private Integer onTimeDelivery;
    private String notes;
    private Integer productCount;

    public static SupplierDTO fromEntity(Supplier supplier) {
        return SupplierDTO.builder()
                .id(supplier.getId())
                .name(supplier.getName())
                .email(supplier.getEmail())
                .phoneNumber(supplier.getPhoneNumber())
                .address(supplier.getAddress())
                .status(supplier.getStatus())
                .country(supplier.getCountry())
                .contactPerson(supplier.getContactPerson())
                .categories(resolveCategories(supplier))
                .rating(supplier.getRating() != null ? supplier.getRating() : BigDecimal.ZERO)
                .onTimeDelivery(supplier.getOnTimeDelivery() != null ? supplier.getOnTimeDelivery() : 0)
                .notes(supplier.getNotes())
                .productCount(supplier.getProducts() != null ? supplier.getProducts().size() : 0)
                .build();
    }

    private static String resolveCategories(Supplier supplier) {
        if (supplier.getCategories() != null && !supplier.getCategories().isBlank()) {
            return supplier.getCategories();
        }
        if (supplier.getProducts() == null) {
            return "";
        }
        return supplier.getProducts().stream()
                .map(product -> product.getCategory() != null ? product.getCategory().getName() : null)
                .filter(Objects::nonNull)
                .distinct()
                .sorted()
                .collect(Collectors.joining(", "));
    }
}
