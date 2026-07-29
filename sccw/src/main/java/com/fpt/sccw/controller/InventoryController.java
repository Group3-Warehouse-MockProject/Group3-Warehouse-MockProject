package com.fpt.sccw.controller;

import com.fpt.sccw.dto.response.InventoryDTO;
import com.fpt.sccw.dto.response.PageResponse;
import com.fpt.sccw.entity.Inventory;
import com.fpt.sccw.repository.InventoryRepository;
import com.fpt.sccw.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryRepository inventoryRepository;
    private final UserRepository userRepository;

    /**
     * Returns a paginated list of inventory rows.
     *
     * Performance notes:
     *  - Uses JOIN FETCH queries (findByWarehouseIdEagerPaged / findAllEagerPaged)
     *    to load Inventory + Product + Category + Supplier + Warehouse + Location
     *    in a single SQL round-trip, eliminating the previous N+1 problem.
     *  - Separate countQuery avoids Hibernate's in-memory pagination.
     */
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<PageResponse<InventoryDTO>> getAllInventory(
            @RequestParam(required = false) Long warehouseIdParam,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        String email = authentication.getName();
        var user = userRepository.findByEmail(email).orElseThrow();
        String roleName = user.getRole().getRoleName().name();

        Pageable pageable = PageRequest.of(page, size, Sort.by("id").ascending());
        Page<Inventory> inventoryPage;

        if (roleName.equals("ADMIN") || roleName.equals("MANAGER")) {
            if (warehouseIdParam != null) {
                // Single JOIN FETCH query — no N+1
                inventoryPage = inventoryRepository.findByWarehouseIdEagerPaged(warehouseIdParam, pageable);
            } else {
                inventoryPage = inventoryRepository.findAllEagerPaged(pageable);
            }
        } else {
            Long warehouseId = user.getWarehouse() != null ? user.getWarehouse().getId() : null;
            if (warehouseId == null) {
                inventoryPage = Page.empty(pageable);
            } else {
                inventoryPage = inventoryRepository.findByWarehouseIdEagerPaged(warehouseId, pageable);
            }
        }

        Page<InventoryDTO> dtoPage = inventoryPage.map(InventoryDTO::fromEntity);
        return ResponseEntity.ok(new PageResponse<>(dtoPage));
    }

    @GetMapping("/low-stock")
    @Transactional(readOnly = true)
    public ResponseEntity<List<InventoryDTO>> getLowStockInventory(
            @RequestParam(required = false) Long warehouseIdParam
    ) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        String email = authentication.getName();
        var user = userRepository.findByEmail(email).orElseThrow();
        String roleName = user.getRole().getRoleName().name();

        List<Inventory> lowStockItems;

        if (roleName.equals("ADMIN") || roleName.equals("MANAGER")) {
            if (warehouseIdParam != null) {
                lowStockItems = inventoryRepository.findLowStockItemsByWarehouseId(warehouseIdParam);
            } else {
                lowStockItems = inventoryRepository.findLowStockItems();
            }
        } else {
            Long warehouseId = user.getWarehouse() != null ? user.getWarehouse().getId() : null;
            if (warehouseId == null) {
                lowStockItems = List.of();
            } else {
                lowStockItems = inventoryRepository.findLowStockItemsByWarehouseId(warehouseId);
            }
        }

        List<InventoryDTO> dtos = lowStockItems.stream().map(InventoryDTO::fromEntity).collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PatchMapping("/{inventoryId}/threshold")
    @Transactional
    public ResponseEntity<?> updateThreshold(
            @PathVariable Long inventoryId,
            @RequestBody Map<String, Object> request
    ) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        String email = authentication.getName();
        var user = userRepository.findByEmail(email).orElseThrow();
        String roleName = user.getRole().getRoleName().name();

        if (!roleName.equals("ADMIN") && !roleName.equals("MANAGER") && !roleName.equals("WAREHOUSE_MANAGER")) {
            return ResponseEntity.status(403).body("Insufficient permissions");
        }

        Long threshold = null;
        if (request.get("lowStockThreshold") != null) {
            threshold = Long.valueOf(request.get("lowStockThreshold").toString());
        }
        if (threshold == null || threshold < 0) {
            return ResponseEntity.badRequest().body("Invalid threshold value");
        }

        Inventory inventory = inventoryRepository.findById(inventoryId).orElse(null);
        if (inventory == null) return ResponseEntity.notFound().build();

        if (roleName.equals("WAREHOUSE_MANAGER")) {
            Long userWarehouseId = user.getWarehouse() != null ? user.getWarehouse().getId() : null;
            if (userWarehouseId == null || !userWarehouseId.equals(inventory.getWarehouse().getId())) {
                return ResponseEntity.status(403).body("You can only modify inventory in your own warehouse");
            }
        }

        inventory.setLowStockThreshold(threshold);
        Inventory saved = inventoryRepository.save(inventory);

        return ResponseEntity.ok(InventoryDTO.fromEntity(saved));
    }

    @PatchMapping("/batch-threshold")
    @Transactional
    public ResponseEntity<?> batchUpdateThreshold(
            @RequestBody Map<String, Object> request
    ) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        String email = authentication.getName();
        var user = userRepository.findByEmail(email).orElseThrow();
        String roleName = user.getRole().getRoleName().name();

        if (!roleName.equals("ADMIN") && !roleName.equals("MANAGER")) {
            return ResponseEntity.status(403).body("Insufficient permissions. Admin or Manager required.");
        }

        Long threshold = null;
        Long outOfStockWarningDays = null;
        if (request.get("lowStockThreshold") != null) {
            threshold = Long.valueOf(request.get("lowStockThreshold").toString());
        }
        if (request.get("outOfStockWarningDays") != null) {
            outOfStockWarningDays = Long.valueOf(request.get("outOfStockWarningDays").toString());
        }
        
        if (threshold == null && outOfStockWarningDays == null) {
            return ResponseEntity.badRequest().body("Must provide at least one value to update");
        }
        if ((threshold != null && threshold < 0) || (outOfStockWarningDays != null && outOfStockWarningDays < 0)) {
            return ResponseEntity.badRequest().body("Invalid threshold value");
        }

        Long warehouseId = null;
        if (request.get("warehouseId") != null) {
            warehouseId = Long.valueOf(request.get("warehouseId").toString());
        }

        List<Inventory> itemsToUpdate;
        if (warehouseId != null) {
            itemsToUpdate = inventoryRepository.findByWarehouseIdEager(warehouseId);
        } else {
            itemsToUpdate = inventoryRepository.findAllEager();
        }

        int count = 0;
        for (Inventory inv : itemsToUpdate) {
            if (threshold != null) inv.setLowStockThreshold(threshold);
            if (outOfStockWarningDays != null) inv.setOutOfStockWarningDays(outOfStockWarningDays);
            count++;
        }
        
        inventoryRepository.saveAll(itemsToUpdate);

        return ResponseEntity.ok(Map.of("updatedCount", count));
    }
}
