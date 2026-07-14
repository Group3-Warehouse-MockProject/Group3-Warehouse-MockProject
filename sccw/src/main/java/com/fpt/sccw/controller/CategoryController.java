package com.fpt.sccw.controller;

import com.fpt.sccw.dto.response.CategoryDTO;
import com.fpt.sccw.entity.Category;
import com.fpt.sccw.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CategoryController {

    private final CategoryRepository categoryRepository;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<CategoryDTO>> getAllCategories() {
        List<Category> categories = categoryRepository.findAll();
        
        List<CategoryDTO> result = categories.stream()
                .filter(c -> !c.getIsDeleted())
                .map(CategoryDTO::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }
}
