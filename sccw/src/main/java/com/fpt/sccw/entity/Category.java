package com.fpt.sccw.entity;

import java.util.*;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Entity
@Table(name = "categories", indexes = {@Index(name = "idx_category_is_deleted", columnList = "is_deleted")})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Category extends BaseEntity{
    
    @NotBlank(message = "Category code is required")
    @Column(name = "category_code", nullable = false, unique = true)
    private String code;

    @NotBlank(message = "Category name is required")
    @Column(name = "category_name", nullable = false, unique = true)
    private String name;

    @Column(name = "category_group")
    @Builder.Default
    private String categoryGroup = "Components";

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @NotNull(message = "Status deleted cannot be null")
    @Column(name = "is_deleted", nullable = false)
    @Builder.Default
    private Boolean isDeleted = false;

    @OneToMany(mappedBy = "category", fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @Builder.Default
    private List<Product> products = new ArrayList<>();
}
