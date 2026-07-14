package com.fpt.sccw.repository;

import java.util.*;

import org.springframework.data.jpa.repository.JpaRepository;
import com.fpt.sccw.entity.Category;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    
    List<Category> findByNameContainingIgnoreCase(String name);

    List<Category> findByIsDeletedFalse();

    List<Category> findByIsDeletedTrue();

    boolean existsByName(String name);
    
}
