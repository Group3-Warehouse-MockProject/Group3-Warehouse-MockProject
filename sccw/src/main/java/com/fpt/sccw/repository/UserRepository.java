package com.fpt.sccw.repository;

import java.util.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.fpt.sccw.entity.User;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    List<User> findByUsernameContainingIgnoreCase(String username);

    List<User> findByFullNameContainingIgnoreCase(String fullName);

    List<User> findByEmailContainingIgnoreCase(String email);

    List<User> findByPhoneContainingIgnoreCase(String phone);

    List<User> findByDepartmentContainingIgnoreCase(String department);

    List<User> findByRoleId(Long roleId);

    List<User> findByWarehouseId(Long warehouseId);

    List<User> findByIsDeletedFalse();

    List<User> findByIsDeletedTrue();

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    boolean existsByWarehouseId(Long warehouseId);

    boolean existsByRoleId(Long roleId);


}