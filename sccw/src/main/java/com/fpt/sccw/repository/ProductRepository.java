package com.fpt.sccw.repository;

import java.util.*;

import org.springframework.data.jpa.repository.JpaRepository;

import com.fpt.sccw.entity.Product;

public interface ProductRepository extends JpaRepository<Product, Long> {
    
    List<Product> findByNameContainingIgnoreCase(String name);

    List<Product> findByCategoryId(Long categoryId);

    List<Product> findBySupplierId(Long supplierId);

    boolean existsByName(String name);

    boolean existsByCode(String code);
    
    List<Product> findByIsDeletedFalse();

    List<Product> findByIsDeletedTrue();

    Optional<Product> findByCode(String code);

    Optional<Product> findByName(String name);

}