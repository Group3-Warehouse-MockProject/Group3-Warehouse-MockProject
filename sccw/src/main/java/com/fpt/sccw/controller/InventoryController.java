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

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
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
}
