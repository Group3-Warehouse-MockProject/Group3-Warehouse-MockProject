package com.fpt.sccw.entity;

import java.util.*;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Entity
@Table(name = "suppliers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Supplier extends BaseEntity{
    
    @NotBlank(message = "Supplier name is required")
    @Column(name = "name", nullable = false)
    private String name;

    @NotBlank(message = "Supplier email is required")
    @Column(name = "email", nullable = false, length = 100)
    private String email;

    @NotBlank(message = "Supplier phone number is required")
    @Column(name = "phone_number", nullable = false, length = 15)
    private String phoneNumber;

    @NotBlank(message = "Supplier address is required")
    @Column(name = "address", nullable = false)
    private String address;

    @NotBlank(message = "Supplier status is required")
    @Column(name = "status", nullable = false)
    private String status;

    @OneToMany(mappedBy = "supplier", fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @Builder.Default
    private List<Product> products = new ArrayList<>();
    
}