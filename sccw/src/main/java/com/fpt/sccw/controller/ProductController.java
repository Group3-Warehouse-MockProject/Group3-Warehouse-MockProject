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
@CrossOrigin(origins = "*")
public class ProductController {

    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final SupplierRepository supplierRepository;
    private final LocationRepository locationRepository;
    private final InventoryRepository inventoryRepository;
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
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "name"));
        Page<Product> productPage = warehouseId != null
                ? productRepository.findPageActiveWithInventory(warehouseId, pageable)
                : productRepository.findPageActiveWithInventoryAll(pageable);

        List<ProductDTO> pageContent = productPage.getContent().stream()
                .map(product -> toProductDto(product, warehouseId))
                .toList();

        return ResponseEntity.ok(new PageResponse<>(pageContent, productPage));
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
        ProductDTO dto = ProductDTO.fromEntity(product, null);
        dto.setStock(stock);
        dto.setReorder(reorder);
        return dto;
    }

    @GetMapping("/occupied-locations")
    @Transactional(readOnly = true)
    public ResponseEntity<List<String>> getOccupiedLocations(@RequestParam Long warehouseId) {
        return ResponseEntity.ok(inventoryRepository.findByWarehouseId(warehouseId).stream()
                .map(Inventory::getLocation)
                .filter(java.util.Objects::nonNull)
                .map(location -> location.getZoneCode() + "-" + location.getRackCode() + "-" + location.getBinCode())
                .distinct()
                .toList());
    }

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

    private User resolveUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        return userRepository.findByEmail(auth.getName()).orElse(null);
    }
}
