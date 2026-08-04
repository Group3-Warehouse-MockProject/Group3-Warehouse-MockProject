package com.fpt.sccw.controller;

import com.fpt.sccw.dto.response.CategoryDTO;
import com.fpt.sccw.entity.Category;
import com.fpt.sccw.entity.User;
import com.fpt.sccw.repository.CategoryRepository;
import com.fpt.sccw.repository.UserRepository;
import com.fpt.sccw.service.ActivityLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final ActivityLogService activityLogService;

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

    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    @PostMapping
    @Transactional
    public ResponseEntity<?> createCategory(@RequestBody Map<String, String> request) {
        String name = request.get("name");
        String description = request.get("description");
        String imageUrl = request.get("imageUrl");

        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Category name is required"));
        }

        if (categoryRepository.existsByName(name.trim())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Category '" + name.trim() + "' already exists"));
        }

        Category category = Category.builder()
                .name(name.trim())
                .description(description)
                .imageUrl(imageUrl)
                .isDeleted(false)
                .build();

        Category saved = categoryRepository.save(category);

        User currentUser = resolveUser();
        if (currentUser != null) {
            activityLogService.log(currentUser, "CREATE_CATEGORY",
                    "Created category '" + saved.getName() + "'");
        }

        return ResponseEntity.ok(CategoryDTO.fromEntity(saved));
    }

    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateCategory(@PathVariable Long id, @RequestBody Map<String, String> request) {
        Category category = categoryRepository.findById(id).orElse(null);
        if (category == null || category.getIsDeleted()) {
            return ResponseEntity.notFound().build();
        }

        String name = request.get("name");
        String description = request.get("description");
        String imageUrl = request.get("imageUrl");

        if (name != null && !name.isBlank()) {
            // Check for duplicate name (excluding current category)
            if (!name.trim().equals(category.getName()) && categoryRepository.existsByName(name.trim())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Category '" + name.trim() + "' already exists"));
            }
            category.setName(name.trim());
        }
        if (description != null) category.setDescription(description);
        if (imageUrl != null) category.setImageUrl(imageUrl);

        Category saved = categoryRepository.save(category);

        User currentUser = resolveUser();
        if (currentUser != null) {
            activityLogService.log(currentUser, "UPDATE_CATEGORY",
                    "Updated category '" + saved.getName() + "'");
        }

        return ResponseEntity.ok(CategoryDTO.fromEntity(saved));
    }

    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> softDeleteCategory(@PathVariable Long id) {
        Category category = categoryRepository.findById(id).orElse(null);
        if (category == null) return ResponseEntity.notFound().build();

        category.setIsDeleted(true);
        categoryRepository.save(category);

        User currentUser = resolveUser();
        if (currentUser != null) {
            activityLogService.log(currentUser, "DELETE_CATEGORY",
                    "Soft-deleted category '" + category.getName() + "'");
        }

        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @DeleteMapping("/{id}/hard")
    @Transactional
    public ResponseEntity<?> hardDeleteCategory(@PathVariable Long id) {
        Category category = categoryRepository.findById(id).orElse(null);
        if (category == null) return ResponseEntity.notFound().build();

        // Check if category has products
        if (category.getProducts() != null && !category.getProducts().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message",
                    "Cannot permanently delete category '" + category.getName()
                            + "' because it has " + category.getProducts().size() + " product(s). Remove or reassign them first."));
        }

        categoryRepository.delete(category);

        User currentUser = resolveUser();
        if (currentUser != null) {
            activityLogService.log(currentUser, "HARD_DELETE_CATEGORY",
                    "Permanently deleted category '" + category.getName() + "'");
        }

        return ResponseEntity.noContent().build();
    }

    private User resolveUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        return userRepository.findByEmail(auth.getName()).orElse(null);
    }
}
