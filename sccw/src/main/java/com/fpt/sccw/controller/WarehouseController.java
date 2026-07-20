package com.fpt.sccw.controller;

import com.fpt.sccw.dto.request.CreateWarehouseRequest;
import com.fpt.sccw.dto.request.UpdateWarehouseRequest;
import com.fpt.sccw.dto.response.WarehouseDTO;
import com.fpt.sccw.entity.User;
import com.fpt.sccw.entity.Warehouse;
import com.fpt.sccw.repository.UserRepository;
import com.fpt.sccw.repository.WarehouseRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/warehouses")
@RequiredArgsConstructor
public class WarehouseController {

    private final WarehouseRepository warehouseRepository;
    private final UserRepository userRepository;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<WarehouseDTO>> getAllWarehouses() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        String email = authentication.getName();
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        List<Warehouse> warehouses = warehouseRepository.findAll();

        List<WarehouseDTO> result = warehouses.stream()
                .map(w -> WarehouseDTO.fromEntity(w, resolveManagerName(w.getId())))
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> createWarehouse(@Valid @RequestBody CreateWarehouseRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        String email = authentication.getName();
        User currentUser = userRepository.findByEmail(email).orElse(null);
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }

        // Chỉ ADMIN hoặc MANAGER mới được tạo kho
        String roleName = currentUser.getRole().getRoleName().name();
        if (!roleName.equals("ADMIN") && !roleName.equals("MANAGER")) {
            return ResponseEntity.status(403).body("Insufficient permissions to create a warehouse");
        }

        // Kiểm tra code đã tồn tại chưa
        boolean codeExists = warehouseRepository.findAll()
                .stream()
                .anyMatch(w -> w.getCode().equalsIgnoreCase(request.getCode()));
        if (codeExists) {
            return ResponseEntity.badRequest().body("Warehouse code already exists: " + request.getCode());
        }

        // Validate managerId nếu có
        User manager = null;
        if (request.getManagerId() != null) {
            manager = userRepository.findById(request.getManagerId()).orElse(null);
            if (manager == null) {
                return ResponseEntity.badRequest().body("Manager user not found: " + request.getManagerId());
            }
            String managerRole = manager.getRole().getRoleName().name();
            if (!managerRole.equals("WAREHOUSE_MANAGER")) {
                return ResponseEntity.badRequest().body("Selected user is not a Warehouse Manager");
            }
        }

        // Tạo và lưu kho mới
        Warehouse warehouse = Warehouse.builder()
                .code(request.getCode().trim().toUpperCase())
                .warehouseName(request.getName().trim())
                .location(request.getAddress().trim())
                .capacity(request.getCapacity())
                .build();

        Warehouse saved = warehouseRepository.save(warehouse);

        // Gán kho cho manager nếu có
        if (manager != null) {
            manager.setWarehouse(saved);
            userRepository.save(manager);
        }

        String managerName = manager != null ? manager.getFullName() : null;
        return ResponseEntity.ok(WarehouseDTO.fromEntity(saved, managerName));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateWarehouse(
            @PathVariable Long id,
            @Valid @RequestBody UpdateWarehouseRequest request) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        String email = authentication.getName();
        User currentUser = userRepository.findByEmail(email).orElse(null);
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }

        // Chỉ ADMIN hoặc MANAGER mới được sửa kho
        String roleName = currentUser.getRole().getRoleName().name();
        if (!roleName.equals("ADMIN") && !roleName.equals("MANAGER")) {
            return ResponseEntity.status(403).body("Insufficient permissions to update a warehouse");
        }

        Warehouse warehouse = warehouseRepository.findById(id).orElse(null);
        if (warehouse == null) {
            return ResponseEntity.status(404).body("Warehouse not found: " + id);
        }

        // Cập nhật thông tin cơ bản
        warehouse.setWarehouseName(request.getName().trim());
        warehouse.setLocation(request.getAddress().trim());
        warehouse.setCapacity(request.getCapacity());

        // Xử lý manager
        if (request.getManagerId() != null) {
            if (request.getManagerId() == -1L) {
                // Unassign: bỏ warehouse khỏi manager hiện tại
                userRepository.findByWarehouseId(id).stream()
                        .filter(u -> u.getRole() != null
                                && u.getRole().getRoleName().name().equals("WAREHOUSE_MANAGER"))
                        .forEach(u -> {
                            u.setWarehouse(null);
                            userRepository.save(u);
                        });
            } else {
                // Gán manager mới
                User newManager = userRepository.findById(request.getManagerId()).orElse(null);
                if (newManager == null) {
                    return ResponseEntity.badRequest().body("Manager user not found: " + request.getManagerId());
                }
                if (!newManager.getRole().getRoleName().name().equals("WAREHOUSE_MANAGER")) {
                    return ResponseEntity.badRequest().body("Selected user is not a Warehouse Manager");
                }
                // Bỏ gán manager cũ trước
                userRepository.findByWarehouseId(id).stream()
                        .filter(u -> u.getRole() != null
                                && u.getRole().getRoleName().name().equals("WAREHOUSE_MANAGER")
                                && !u.getId().equals(newManager.getId()))
                        .forEach(u -> {
                            u.setWarehouse(null);
                            userRepository.save(u);
                        });
                // Gán kho cho manager mới
                newManager.setWarehouse(warehouse);
                userRepository.save(newManager);
            }
        }

        Warehouse saved = warehouseRepository.save(warehouse);
        String managerName = resolveManagerName(saved.getId());
        return ResponseEntity.ok(WarehouseDTO.fromEntity(saved, managerName));
    }

    /** Tìm tên Warehouse Manager đang được gán cho kho này */
    private String resolveManagerName(Long warehouseId) {
        return userRepository.findByWarehouseId(warehouseId)
                .stream()
                .filter(u -> u.getRole() != null
                        && u.getRole().getRoleName().name().equals("WAREHOUSE_MANAGER")
                        && !Boolean.TRUE.equals(u.getIsDeleted()))
                .map(User::getFullName)
                .findFirst()
                .orElse(null);
    }
}

