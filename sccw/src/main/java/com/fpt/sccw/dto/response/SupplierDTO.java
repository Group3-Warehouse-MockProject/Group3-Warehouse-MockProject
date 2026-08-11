package com.fpt.sccw.dto.response;

import java.math.BigDecimal;
import java.util.List;

import com.fpt.sccw.entity.Category;
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
    private String contactPerson;
    private BigDecimal rating;
    private Integer onTimeDelivery;
    private String notes;
    private List<Long> categoryIds;
    private List<CategorySummary> categories;

    @Data
    @Builder
    public static class CategorySummary {
        private Long id;
        private String code;
        private String name;

        private static CategorySummary fromEntity(Category category) {
            return CategorySummary.builder()
                    .id(category.getId())
                    .code(category.getCode())
                    .name(category.getName())
                    .build();
        }
    }

    public static SupplierDTO fromEntity(Supplier supplier) {
        List<CategorySummary> categories = supplier.getCategories() == null ? List.of()
                : supplier.getCategories().stream()
                        .map(CategorySummary::fromEntity)
                        .toList();

        return SupplierDTO.builder()
                .id(supplier.getId())
                .name(supplier.getName())
                .email(supplier.getEmail())
                .phoneNumber(supplier.getPhoneNumber())
                .address(supplier.getAddress())
                .status(supplier.getStatus() != null ? supplier.getStatus().name() : null)
                .country(supplier.getCountry())
                .contactPerson(supplier.getContactPerson())
                .rating(supplier.getRating() != null ? supplier.getRating() : BigDecimal.ZERO)
                .onTimeDelivery(supplier.getOnTimeDelivery() != null ? supplier.getOnTimeDelivery() : 0)
                .notes(supplier.getNotes())
                .categoryIds(categories.stream().map(CategorySummary::getId).toList())
                .categories(categories)
                .build();
    }
}
