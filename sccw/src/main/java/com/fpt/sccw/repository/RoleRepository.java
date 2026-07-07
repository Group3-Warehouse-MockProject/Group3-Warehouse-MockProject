package com.fpt.sccw.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.fpt.sccw.entity.Role;
import com.fpt.sccw.entity.Role.RoleName;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long>{

    Optional<Role> findByRoleName(RoleName roleName);
    
}
