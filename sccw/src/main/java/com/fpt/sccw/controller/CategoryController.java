package com.fpt.sccw.controller;

import com.fpt.sccw.dto.response.CategoryDTO;
import com.fpt.sccw.entity.Category;
import com.fpt.sccw.entity.User;
import com.fpt.sccw.repository.CategoryRepository;
import com.fpt.sccw.repository.UserRepository;
import com.fpt.sccw.service.ActivityLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
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
    public ResponseEntity<Map<String, Object>> getAllCategories(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String categoryGroup,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "15") int size) {

        Specification<Category> spec = (root, query, cb) -> cb.conjunction();

        if (search != null && !search.isBlank()) {
            String q = "%" + search.trim().toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("name")), q),
                    cb.like(cb.lower(root.get("code")), q),
                    cb.like(cb.lower(root.get("description")), q)
            ));
        }

        if (categoryGroup != null && !categoryGroup.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("categoryGroup"), categoryGroup));
        }

        if (status != null && !status.isBlank()) {
            if ("Active".equalsIgnoreCase(status)) {
                spec = spec.and((root, query, cb) -> cb.equal(root.get("isDeleted"), false));
            } else if ("Archived".equalsIgnoreCase(status)) {
                spec = spec.and((root, query, cb) -> cb.equal(root.get("isDeleted"), true));
            }
        }

        Pageable pageable = PageRequest.of(page, size);
        Page<Category> categoryPage = categoryRepository.findAll(spec, pageable);

        List<CategoryDTO> content = categoryPage.getContent().stream()
                .map(CategoryDTO::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
                "content", content,
                "totalPages", categoryPage.getTotalPages(),
                "totalElements", categoryPage.getTotalElements()
        ));
    }

    @GetMapping("/stats")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getCategoryStats() {
        List<Category> all = categoryRepository.findAll();
        long totalCategories = all.size();
        long activeCount = all.stream().filter(c -> !Boolean.TRUE.equals(c.getIsDeleted())).count();
        long archivedCount = all.stream().filter(c -> Boolean.TRUE.equals(c.getIsDeleted())).count();
        long totalUnitsInStock = all.stream()
                .filter(c -> !Boolean.TRUE.equals(c.getIsDeleted()))
                .flatMap(c -> c.getProducts() != null ? c.getProducts().stream() : java.util.stream.Stream.empty())
                .filter(p -> !Boolean.TRUE.equals(p.getIsDeleted()))
                .flatMap(p -> p.getInventories() != null ? p.getInventories().stream() : java.util.stream.Stream.empty())
                .mapToLong(inv -> inv.getQuantity())
                .sum();

        return ResponseEntity.ok(Map.of(
                "totalCategories", totalCategories,
                "activeCount", activeCount,
                "archivedCount", archivedCount,
                "totalUnitsInStock", totalUnitsInStock
        ));
    }

    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    @PostMapping
    @Transactional
    public ResponseEntity<?> createCategory(@RequestBody Map<String, String> request) {
        String code = request.get("code");
        String name = request.get("name");
        String categoryGroup = request.get("categoryGroup");
        String description = request.get("description");

        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Category code is required"));
        }

        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Category name is required"));
        }

        if (categoryRepository.existsByCode(code.trim().toUpperCase())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Category code '" + code.trim().toUpperCase() + "' already exists"));
        }

        if (categoryRepository.existsByName(name.trim())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Category '" + name.trim() + "' already exists"));
        }

        Category category = Category.builder()
                .code(code.trim().toUpperCase())
                .name(name.trim())
                .categoryGroup(categoryGroup != null ? categoryGroup.trim() : "Components")
                .description(description)
                .isDeleted(false)
                .build();

        Category saved = categoryRepository.save(category);

        User currentUser = resolveUser();
        if (currentUser != null) {
            activityLogService.log(currentUser, "CREATE_CATEGORY",
                    "Created category '" + saved.getName() + "' [" + saved.getCode() + "]");
        }

        return ResponseEntity.ok(CategoryDTO.fromEntity(saved));
    }

    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateCategory(@PathVariable Long id, @RequestBody Map<String, String> request) {
        Category category = categoryRepository.findById(id).orElse(null);
        if (category == null) {
            return ResponseEntity.notFound().build();
        }

        String code = request.get("code");
        String name = request.get("name");
        String categoryGroup = request.get("categoryGroup");
        String description = request.get("description");
        String status = request.get("status");

        if (code != null && !code.isBlank()) {
            String upperCode = code.trim().toUpperCase();
            if (!upperCode.equals(category.getCode()) && categoryRepository.existsByCode(upperCode)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Category code '" + upperCode + "' already exists"));
            }
            category.setCode(upperCode);
        }

        if (name != null && !name.isBlank()) {
            if (!name.trim().equals(category.getName()) && categoryRepository.existsByName(name.trim())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Category '" + name.trim() + "' already exists"));
            }
            category.setName(name.trim());
        }

        if (categoryGroup != null) category.setCategoryGroup(categoryGroup.trim());
        if (description != null) category.setDescription(description);

        // Handle status: "Active" or "Archived"
        if (status != null) {
            category.setIsDeleted("Archived".equalsIgnoreCase(status.trim()));
        }

        Category saved = categoryRepository.save(category);

        User currentUser = resolveUser();
        if (currentUser != null) {
            activityLogService.log(currentUser, "UPDATE_CATEGORY",
                    "Updated category '" + saved.getName() + "' [" + saved.getCode() + "]");
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
