package com.fpt.sccw.entity;

import java.util.*;
import java.math.BigDecimal;

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
    @Column(name = "phone_number", nullable = false, length = 20)
    private String phoneNumber;

    @NotBlank(message = "Supplier address is required")
    @Column(name = "address", nullable = false)
    private String address;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private Status.SupplierStatus status = Status.SupplierStatus.ACTIVE;

    @NotBlank(message = "Supplier country is required")
    @Column(name = "country", nullable = false)
    private String country;

    @Column(name = "contact_person", length = 100)
    private String contactPerson;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "supplier_categories",
        joinColumns = @JoinColumn(name = "supplier_id"),
        inverseJoinColumns = @JoinColumn(name = "category_id")
    )
    @Builder.Default
    private Set<Category> categories = new HashSet<>();

    @Column(name = "rating", precision = 2, scale = 1)
    private BigDecimal rating;

    @Column(name = "on_time_delivery")
    private Integer onTimeDelivery;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @OneToMany(mappedBy = "supplier", fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @Builder.Default
    private List<Product> products = new ArrayList<>();
    
}
