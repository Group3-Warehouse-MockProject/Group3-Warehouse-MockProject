package com.fpt.sccw.controller;

import com.fpt.sccw.dto.request.CreateWarehouseRequest;
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
                .map(WarehouseDTO::fromEntity)
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
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        // Chỉ ADMIN hoặc MANAGER mới được tạo kho
        String roleName = user.getRole().getRoleName().name();
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

        Warehouse warehouse = Warehouse.builder()
                .code(request.getCode().trim().toUpperCase())
                .warehouseName(request.getName().trim())
                .location(request.getAddress().trim())
                .capacity(request.getCapacity())
                .build();

        Warehouse saved = warehouseRepository.save(warehouse);
        return ResponseEntity.ok(WarehouseDTO.fromEntity(saved));
    }
}
