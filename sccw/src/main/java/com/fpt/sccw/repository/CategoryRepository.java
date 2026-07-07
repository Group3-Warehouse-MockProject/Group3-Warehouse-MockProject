package com.fpt.sccw.repository;

import java.util.*;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.fpt.sccw.entity.Category;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {
    
    List<Category> findByNameContainingIgnoreCase(String name);

    List<Category> findByIsDeletedFalse();

    List<Category> findByIsDeletedTrue();

    boolean existsByName(String name);
    
}
