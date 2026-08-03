package com.fpt.sccw.repository;

import java.util.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.fpt.sccw.entity.User;

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

    @Query(value = "SELECT u FROM User u LEFT JOIN FETCH u.role LEFT JOIN FETCH u.warehouse " +
                   "WHERE (:search IS NULL OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))) " +
                   "AND (:role IS NULL OR u.role.roleName = :role) " +
                   "AND (:isDeleted IS NULL OR u.isDeleted = :isDeleted) " +
                   "AND (:warehouseId IS NULL OR u.warehouse.id = :warehouseId)",
           countQuery = "SELECT COUNT(u) FROM User u " +
                        "WHERE (:search IS NULL OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))) " +
                        "AND (:role IS NULL OR u.role.roleName = :role) " +
                        "AND (:isDeleted IS NULL OR u.isDeleted = :isDeleted) " +
                        "AND (:warehouseId IS NULL OR u.warehouse.id = :warehouseId)")
    Page<User> findUsersFiltered(@Param("search") String search, 
                                 @Param("role") com.fpt.sccw.entity.Role.RoleName role, 
                                 @Param("isDeleted") Boolean isDeleted, 
                                 @Param("warehouseId") Long warehouseId, 
                                 Pageable pageable);
}