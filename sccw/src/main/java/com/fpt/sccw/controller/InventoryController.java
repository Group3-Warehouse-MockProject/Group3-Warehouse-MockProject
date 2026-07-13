package com.fpt.sccw.controller;

import com.fpt.sccw.dto.response.InventoryDTO;
import com.fpt.sccw.entity.Inventory;
import com.fpt.sccw.repository.InventoryRepository;
import com.fpt.sccw.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class InventoryController {

    private final InventoryRepository inventoryRepository;
    private final UserRepository userRepository;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<InventoryDTO>> getAllInventory(
            @RequestParam(required = false) Long warehouseIdParam
    ) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        String email = authentication.getName();
        // Fetch user from DB to check role and warehouse
        var user = userRepository.findByEmail(email).orElseThrow();
        
        String roleName = user.getRole().getRoleName().name();
        
        List<Inventory> inventories;

        if (roleName.equals("ADMIN") || roleName.equals("MANAGER")) {
            // Admin and Manager can see all inventory, or filter by specific warehouse
            if (warehouseIdParam != null) {
                inventories = inventoryRepository.findByWarehouseId(warehouseIdParam);
            } else {
                inventories = inventoryRepository.findAll();
            }
        } else {
            // Warehouse Manager and Staff can only see their warehouse's inventory
            Long warehouseId = user.getWarehouse() != null ? user.getWarehouse().getId() : null;
            if (warehouseId == null) {
                // If they don't have a warehouse assigned, they see nothing
                inventories = List.of();
            } else {
                inventories = inventoryRepository.findByWarehouseId(warehouseId);
            }
        }

        List<InventoryDTO> result = inventories.stream()
                .map(InventoryDTO::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }
}
