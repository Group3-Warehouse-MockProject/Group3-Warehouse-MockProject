package com.fpt.sccw.dto.request;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupplierRequest {

    @NotBlank(message = "Supplier name is required")
    @Size(max = 255, message = "Supplier name must not exceed 255 characters")
    private String name;

    @NotBlank(message = "Supplier email is required")
    @Email(message = "Supplier email is invalid")
    @Size(max = 100, message = "Supplier email must not exceed 100 characters")
    private String email;

    @NotBlank(message = "Supplier phone number is required")
    @Size(max = 20, message = "Supplier phone number must not exceed 20 characters")
    private String phoneNumber;

    @NotBlank(message = "Supplier address is required")
    private String address;

    @NotBlank(message = "Supplier country is required")
    private String country;

    @Size(max = 100, message = "Contact person must not exceed 100 characters")
    private String contactPerson;

    @Size(max = 500, message = "Categories must not exceed 500 characters")
    private String categories;

    @DecimalMin(value = "0.0", message = "Rating must be at least 0")
    @DecimalMax(value = "5.0", message = "Rating must not exceed 5")
    private BigDecimal rating;

    @Min(value = 0, message = "On-time delivery must be at least 0")
    @Max(value = 100, message = "On-time delivery must not exceed 100")
    private Integer onTimeDelivery;

    private String notes;

    @Pattern(regexp = "ACTIVE|INACTIVE", message = "Status must be ACTIVE or INACTIVE")
    private String status;
}
