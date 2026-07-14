package com.fpt.sccw.controller;

import com.fpt.sccw.dto.response.ProductDTO;
import com.fpt.sccw.entity.Product;
import com.fpt.sccw.entity.User;
import com.fpt.sccw.entity.Warehouse;
import com.fpt.sccw.entity.Inventory;
import com.fpt.sccw.repository.ProductRepository;
import com.fpt.sccw.repository.UserRepository;
import com.fpt.sccw.repository.InventoryRepository;
import com.fpt.sccw.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import com.fpt.sccw.dto.request.ProductRequest;
import com.fpt.sccw.entity.Category;
import com.fpt.sccw.entity.Supplier;
import com.fpt.sccw.repository.CategoryRepository;
import com.fpt.sccw.repository.SupplierRepository;
import com.fpt.sccw.repository.LocationRepository;
import com.fpt.sccw.entity.Location;


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

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<ProductDTO>> getAllProducts(
            @RequestParam(required = false) Long warehouseIdParam) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        String email = authentication.getName();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        String roleName = user.getRole().getRoleName().name();

        List<Product> products = productRepository.findByIsDeletedFalse();

        // Use the requested warehouseId or default to the user's warehouse if
        // applicable
        Long effectiveWarehouseId = warehouseIdParam;
        if (!roleName.equals("ADMIN") && !roleName.equals("MANAGER")) {
            effectiveWarehouseId = user.getWarehouse() != null ? user.getWarehouse().getId() : null;
        }

        // Must be effectively final for lambda
        final Long wId = effectiveWarehouseId;

        List<ProductDTO> result = new java.util.ArrayList<>();
        List<Warehouse> allWarehouses = wId == null ? warehouseRepository.findAll() : null;

        for (Product p : products) {
            List<com.fpt.sccw.entity.Inventory> inventories = p.getInventories();
            
            if (wId != null) {
                boolean foundInFilteredWarehouse = false;
                if (inventories != null) {
                    for (com.fpt.sccw.entity.Inventory inv : inventories) {
                        if (inv.getWarehouse() != null && inv.getWarehouse().getId().equals(wId)) {
                            result.add(ProductDTO.fromEntity(p, inv));
                            foundInFilteredWarehouse = true;
                            break;
                        }
                    }
                }
                if (!foundInFilteredWarehouse) {
                    ProductDTO dto = ProductDTO.fromEntity(p, null);
                    dto.setWarehouseId(String.valueOf(wId));
                    result.add(dto);
                }
            } else {
                if (allWarehouses != null && !allWarehouses.isEmpty()) {
                    for (Warehouse w : allWarehouses) {
                        com.fpt.sccw.entity.Inventory foundInv = null;
                        if (inventories != null) {
                            for (com.fpt.sccw.entity.Inventory inv : inventories) {
                                if (inv.getWarehouse() != null && inv.getWarehouse().getId().equals(w.getId())) {
                                    foundInv = inv;
                                    break;
                                }
                            }
                        }
                        if (foundInv != null) {
                            result.add(ProductDTO.fromEntity(p, foundInv));
                        } else {
                            ProductDTO dto = ProductDTO.fromEntity(p, null);
                            dto.setWarehouseId(String.valueOf(w.getId()));
                            result.add(dto);
                        }
                    }
                } else {
                    result.add(ProductDTO.fromEntity(p, null));
                }
            }
        }

        return ResponseEntity.ok(result);
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
}
