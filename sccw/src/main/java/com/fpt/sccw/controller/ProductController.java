package com.fpt.sccw.controller;

import com.fpt.sccw.dto.response.PageResponse;
import com.fpt.sccw.dto.response.ProductDTO;
import com.fpt.sccw.entity.*;
import com.fpt.sccw.repository.*;
import com.fpt.sccw.service.ActivityLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import com.fpt.sccw.dto.request.ProductRequest;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final SupplierRepository supplierRepository;
    private final LocationRepository locationRepository;
    private final InventoryRepository inventoryRepository;
    private final ReceiptDetailRepository receiptDetailRepository;
    private final TransferDetailRepository transferDetailRepository;
    private final InventoryCheckDetailRepository inventoryCheckDetailRepository;
    private final WarehouseRepository warehouseRepository;
    private final ActivityLogService activityLogService;

    /**
     * Returns a paginated list of products with warehouse/inventory data.
     *
     * Performance notes:
     *  - Uses JOIN FETCH (findPageActiveWithInventoryAll / findPageActiveWithInventory)
     *    to load Product + Category + Supplier + Inventories + Warehouse + Location
     *    in 2 SQL statements (data + count), eliminating the previous N+1 loop.
     *  - In-memory grouping reconstructs one DTO per (product × warehouse) as before.
     */
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<PageResponse<ProductDTO>> getAllProducts(
            @RequestParam(required = false) Long warehouseIdParam,
            @RequestParam(defaultValue = "ACTIVE") String lifecycleStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        String email = authentication.getName();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) return ResponseEntity.status(401).build();

        String roleName = user.getRole().getRoleName().name();
        Long effectiveWarehouseId = warehouseIdParam;
        if (!roleName.equals("ADMIN") && !roleName.equals("MANAGER")) {
            effectiveWarehouseId = user.getWarehouse() != null ? user.getWarehouse().getId() : null;
        }
        if (page < 0 || size < 1 || size > 100) {
            return ResponseEntity.badRequest().build();
        }

        final Long warehouseId = effectiveWarehouseId;
        String normalizedLifecycleStatus = lifecycleStatus.trim().toUpperCase();
        if (!normalizedLifecycleStatus.equals("ACTIVE")
                && !normalizedLifecycleStatus.equals("DEACTIVE")
                && !normalizedLifecycleStatus.equals("ALL")) {
            return ResponseEntity.badRequest().build();
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "name"));
        Page<Product> productPage = switch (normalizedLifecycleStatus) {
            case "ACTIVE" -> productRepository.findPageByDeletedStatusWithInventoryAll(false, pageable);
            case "DEACTIVE" -> productRepository.findPageByDeletedStatusWithInventoryAll(true, pageable);
            case "ALL" -> productRepository.findPageWithInventoryAll(pageable);
            default -> throw new IllegalStateException("Unexpected lifecycle status");
        };

        List<ProductDTO> pageContent = productPage.getContent().stream()
                .map(product -> toProductDto(product, warehouseId))
                .toList();

        return ResponseEntity.ok(new PageResponse<>(pageContent, productPage));
    }

    /**
     * Returns aggregate product/inventory statistics for the KPI cards.
     * This avoids the frontend calculating stats from paginated data.
     */
    @GetMapping("/stats")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getProductStats(
            @RequestParam(required = false) Long warehouseIdParam) {

        User user = resolveUser();
        if (user == null) return ResponseEntity.status(401).build();

        String roleName = user.getRole().getRoleName().name();
        Long effectiveWarehouseId = warehouseIdParam;
        if (!roleName.equals("ADMIN") && !roleName.equals("MANAGER")) {
            effectiveWarehouseId = user.getWarehouse() != null ? user.getWarehouse().getId() : null;
        }

        List<Inventory> inventories;
        if (effectiveWarehouseId != null) {
            inventories = inventoryRepository.findByWarehouseIdEager(effectiveWarehouseId);
        } else {
            inventories = inventoryRepository.findAllEager();
        }

        long totalSKUs = inventories.stream()
                .map(inv -> inv.getProduct().getId())
                .distinct()
                .count();

        long totalUnits = inventories.stream()
                .mapToLong(inv -> inv.getQuantity() != null ? inv.getQuantity() : 0L)
                .sum();

        long lowStockCount = inventories.stream()
                .filter(inv -> inv.getLowStockThreshold() != null && inv.getLowStockThreshold() > 0
                        && inv.getQuantity() != null && inv.getQuantity() <= inv.getLowStockThreshold())
                .count();

        java.math.BigDecimal inventoryValue = inventories.stream()
                .map(inv -> {
                    long qty = inv.getQuantity() != null ? inv.getQuantity() : 0L;
                    java.math.BigDecimal cost = inv.getProduct().getCost() != null
                            ? inv.getProduct().getCost() : java.math.BigDecimal.ZERO;
                    return cost.multiply(java.math.BigDecimal.valueOf(qty));
                })
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        return ResponseEntity.ok(java.util.Map.of(
                "totalSKUs", totalSKUs,
                "totalUnits", totalUnits,
                "lowStockCount", lowStockCount,
                "inventoryValue", inventoryValue
        ));
    }

    /**
     * A product list page contains one row per product. For a warehouse-scoped
     * request its matching inventory is displayed; in the all-warehouses scope
     * stock is aggregated across inventories rather than expanding product × warehouse.
     */
    private ProductDTO toProductDto(Product product, Long warehouseId) {
        if (warehouseId != null) {
            Inventory inventory = product.getInventories().stream()
                    .filter(inv -> inv.getWarehouse() != null && warehouseId.equals(inv.getWarehouse().getId()))
                    .findFirst()
                    .orElse(null);
            ProductDTO dto = ProductDTO.fromEntity(product, inventory);
            if (inventory == null) dto.setWarehouseId(String.valueOf(warehouseId));
            return dto;
        }

        long stock = product.getInventories().stream()
                .mapToLong(inv -> inv.getQuantity() != null ? inv.getQuantity() : 0L)
                .sum();
        long reorder = product.getInventories().stream()
                .mapToLong(inv -> inv.getLowStockThreshold() != null ? inv.getLowStockThreshold() : 0L)
                .sum();
                
        String warehouseIds = product.getInventories().stream()
                .filter(inv -> inv.getWarehouse() != null)
                .map(inv -> String.valueOf(inv.getWarehouse().getId()))
                .distinct()
                .collect(java.util.stream.Collectors.joining(","));
                
        ProductDTO dto = ProductDTO.fromEntity(product, null);
        dto.setStock(stock);
        dto.setReorder(reorder);
        dto.setWarehouseId(warehouseIds);
        return dto;
    }

    @GetMapping("/occupied-locations")
    @Transactional(readOnly = true)
    public ResponseEntity<List<String>> getOccupiedLocations(@RequestParam Long warehouseId) {
        return ResponseEntity.ok(inventoryRepository.findByWarehouseId(warehouseId).stream()
                .map(Inventory::getLocation)
                .filter(java.util.Objects::nonNull)
                .map(location -> location.getRackCode() + "-" + location.getBinCode())
                .distinct()
                .toList());
    }

    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER')")
    @PostMapping
    @Transactional
    public ResponseEntity<ProductDTO> saveNewProduct(@RequestBody ProductRequest request) {
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Category not found"));
        Supplier supplier = supplierRepository.findById(request.getSupplierId())
                .orElseThrow(() -> new RuntimeException("Supplier not found"));

        Product product = Product.builder()
                .code(request.getCode())
                .name(request.getName())
                .specification(request.getSpecification())
                .cost(request.getCost())
                .price(request.getPrice())
                .imageUrl(request.getImageUrl())
                .category(category)
                .supplier(supplier)
                .isDeleted(false)
                .build();

        Product savedProduct = productRepository.save(product);

        User currentUser = resolveUser();
        if (currentUser != null) {
            activityLogService.log(currentUser, "CREATE_PRODUCT",
                    "Created product " + savedProduct.getCode() + " - " + savedProduct.getName());
        }

        Inventory savedInventory = null;
        if (request.getWarehouseId() != null) {
            Warehouse warehouse = warehouseRepository.findById(request.getWarehouseId())
                    .orElseThrow(() -> new RuntimeException("Warehouse not found"));
            
            Location location = null;
            if (request.getLocationId() != null) {
                location = locationRepository.findById(request.getLocationId())
                        .orElseThrow(() -> new RuntimeException("Location not found"));
            }
            
            Inventory inventory = Inventory.builder()
                    .product(savedProduct)
                    .warehouse(warehouse)
                    .location(location)
                    .quantity(request.getInitialStock() != null ? request.getInitialStock() : 0L)
                    .lowStockThreshold(request.getReorderPoint() != null ? request.getReorderPoint() : 0L)
                    .build();
            savedInventory = inventoryRepository.save(inventory);
        }

        return ResponseEntity.ok(ProductDTO.fromEntity(savedProduct, savedInventory));
    }

    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER')")
    @PostMapping("/bulk")
    @Transactional
    public ResponseEntity<List<ProductDTO>> saveBulkProducts(@RequestBody List<ProductRequest> requests) {
        List<ProductDTO> result = new java.util.ArrayList<>();
        for (ProductRequest request : requests) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new RuntimeException("Category not found for ID: " + request.getCategoryId()));
            Supplier supplier = supplierRepository.findById(request.getSupplierId())
                    .orElseThrow(() -> new RuntimeException("Supplier not found for ID: " + request.getSupplierId()));

            Product product = Product.builder()
                    .code(request.getCode())
                    .name(request.getName())
                    .specification(request.getSpecification())
                    .cost(request.getCost())
                    .price(request.getPrice())
                    .imageUrl(request.getImageUrl())
                    .category(category)
                    .supplier(supplier)
                    .isDeleted(false)
                    .build();

            Product savedProduct = productRepository.save(product);

            Inventory savedInventory = null;
            if (request.getWarehouseId() != null) {
                Warehouse warehouse = warehouseRepository.findById(request.getWarehouseId())
                        .orElseThrow(() -> new RuntimeException("Warehouse not found for ID: " + request.getWarehouseId()));
                
                Location location = null;
                if (request.getLocationId() != null) {
                    location = locationRepository.findById(request.getLocationId())
                            .orElseThrow(() -> new RuntimeException("Location not found for ID: " + request.getLocationId()));
                }
                
                Inventory inventory = Inventory.builder()
                        .product(savedProduct)
                        .warehouse(warehouse)
                        .location(location)
                        .quantity(request.getInitialStock() != null ? request.getInitialStock() : 0L)
                        .lowStockThreshold(request.getReorderPoint() != null ? request.getReorderPoint() : 0L)
                        .build();
                savedInventory = inventoryRepository.save(inventory);
            }
            result.add(ProductDTO.fromEntity(savedProduct, savedInventory));
        }
        return ResponseEntity.ok(result);
    }

    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER')")
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateProduct(@PathVariable Long id, @RequestBody ProductRequest request) {
        Product product = productRepository.findById(id).orElse(null);
        if (product == null || product.getIsDeleted()) {
            return ResponseEntity.notFound().build();
        }

        if (request.getName() != null) product.setName(request.getName());
        if (request.getCode() != null) product.setCode(request.getCode());
        if (request.getSpecification() != null) product.setSpecification(request.getSpecification());
        if (request.getCost() != null) product.setCost(request.getCost());
        if (request.getPrice() != null) product.setPrice(request.getPrice());
        if (request.getImageUrl() != null) product.setImageUrl(request.getImageUrl());

        if (request.getCategoryId() != null) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new RuntimeException("Category not found"));
            product.setCategory(category);
        }
        if (request.getSupplierId() != null) {
            Supplier supplier = supplierRepository.findById(request.getSupplierId())
                    .orElseThrow(() -> new RuntimeException("Supplier not found"));
            product.setSupplier(supplier);
        }

        Product saved = productRepository.save(product);

        User currentUser = resolveUser();
        if (currentUser != null) {
            activityLogService.log(currentUser, "UPDATE_PRODUCT",
                    "Updated product " + saved.getCode() + " - " + saved.getName());
        }

        return ResponseEntity.ok(ProductDTO.fromEntity(saved, null));
    }

    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    @PutMapping("/{id}/reactivate")
    @Transactional
    public ResponseEntity<?> reactivateProduct(@PathVariable Long id) {
        Product product = productRepository.findById(id).orElse(null);
        if (product == null) return ResponseEntity.notFound().build();

        product.setIsDeleted(false);
        productRepository.save(product);

        User currentUser = resolveUser();
        if (currentUser != null) {
            activityLogService.log(currentUser, "REACTIVATE_PRODUCT",
                    "Reactivated product " + product.getCode() + " - " + product.getName());
        }

        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> softDeleteProduct(@PathVariable Long id) {
        Product product = productRepository.findById(id).orElse(null);
        if (product == null) return ResponseEntity.notFound().build();

        product.setIsDeleted(true);
        productRepository.save(product);

        User currentUser = resolveUser();
        if (currentUser != null) {
            activityLogService.log(currentUser, "DELETE_PRODUCT",
                    "Soft-deleted product " + product.getCode() + " - " + product.getName());
        }

        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasAuthority('ADMIN')")
    @DeleteMapping("/{id}/hard")
    @Transactional
    public ResponseEntity<?> hardDeleteProduct(@PathVariable Long id) {
        Product product = productRepository.findById(id).orElse(null);
        if (product == null) return ResponseEntity.notFound().build();

        boolean hasReceiptHistory = receiptDetailRepository.existsByProductId(product.getId());
        boolean hasTransferHistory = transferDetailRepository.existsByProductId(product.getId());
        boolean hasInventoryCheckHistory = inventoryCheckDetailRepository.existsByProductId(product.getId());
        if (hasReceiptHistory || hasTransferHistory || hasInventoryCheckHistory) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.CONFLICT).body(java.util.Map.of(
                    "message", "Cannot permanently delete product '" + product.getCode()
                            + "' because it has transaction history. Deactivate the product instead."
            ));
        }

        // An unused product may have initial inventory records; remove them first.
        List<Inventory> inventories = inventoryRepository.findAllByProductId(product.getId());
        if (!inventories.isEmpty()) {
            inventoryRepository.deleteAll(inventories);
        }

        productRepository.delete(product);

        User currentUser = resolveUser();
        if (currentUser != null) {
            activityLogService.log(currentUser, "HARD_DELETE_PRODUCT",
                    "Permanently deleted product " + product.getCode());
        }

        return ResponseEntity.noContent().build();
    }

    private User resolveUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("Authenticated user not found in database"));
    }
}
