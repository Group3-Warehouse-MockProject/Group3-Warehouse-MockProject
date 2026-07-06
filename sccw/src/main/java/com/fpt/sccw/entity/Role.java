package com.fpt.sccw.entity;

import java.util.*;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Entity
@Table(name = "roles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Role extends BaseEntity{

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Role name is required")
    @Column(name = "role_name", nullable = false, unique = true)    
    private RoleName roleName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @OneToMany(mappedBy = "role", fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @Builder.Default
    private List<User> users = new ArrayList<>();
    
    public enum RoleName{
        ADMIN,
        MANAGER,
        WAREHOUSE_MANAGER,
        STAFF
    }
}
