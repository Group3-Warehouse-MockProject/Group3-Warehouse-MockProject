package com.fpt.sccw.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

@Entity
@Table(name = "roles", uniqueConstraints = @UniqueConstraint(name = "role_name_unique",columnNames = "role_name" ))
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Role extends BaseEntity{

    @Enumerated(EnumType.STRING)
    @NotNull(message = "Role name is required")
    @Column(name = "role_name", nullable = false, unique = true)
    @Builder.Default
    private RoleName roleName = RoleName.STAFF;
    
    public enum RoleName{
        ADMIN,
        MANAGER,
        WAREHOUSE_MANAGER,
        STAFF
    }
}
