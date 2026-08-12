package com.fpt.sccw.controller;

import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fpt.sccw.dto.request.SupplierRequest;
import com.fpt.sccw.dto.response.PageResponse;
import com.fpt.sccw.dto.response.SupplierDTO;
import com.fpt.sccw.entity.Status;
import com.fpt.sccw.entity.Supplier;
import com.fpt.sccw.repository.SupplierRepository;
import com.fpt.sccw.service.SupplierService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierRepository supplierRepository;
    private final SupplierService supplierService;

    @GetMapping
    public ResponseEntity<PageResponse<SupplierDTO>> getAllSuppliers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String country,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        if (page < 0 || size < 1 || size > 100) {
            return ResponseEntity.badRequest().build();
        }

        Status.SupplierStatus supplierStatus;
        try {
            supplierStatus = status == null || status.isBlank() ? null
                    : Status.SupplierStatus.valueOf(status.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "name"));
        Page<Supplier> suppliers = supplierRepository.findSuppliersFiltered(search, supplierStatus, country, pageable);
        List<SupplierDTO> content = suppliers.getContent().stream()
                .map(SupplierDTO::fromEntity)
                .toList();
        return ResponseEntity.ok(new PageResponse<>(content, suppliers));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SupplierDTO> getSupplier(@PathVariable Long id) {
        return ResponseEntity.ok(supplierService.getSupplier(id));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getSupplierStats() {
        long totalSuppliers = supplierRepository.count();
        double avgRating = supplierRepository.getAverageRating();
        double avgOnTime = supplierRepository.getAverageOnTimeDelivery();
        long countriesCount = supplierRepository.countDistinctCountries();

        return ResponseEntity.ok(Map.of(
                "total", totalSuppliers,
                "avgRating", String.format(Locale.US, "%.2f", avgRating),
                "avgOnTime", Math.round(avgOnTime) + "%",
                "countriesCount", countriesCount));
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    public ResponseEntity<SupplierDTO> createSupplier(@Valid @RequestBody SupplierRequest request) {
        return ResponseEntity.status(201).body(supplierService.createSupplier(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SupplierDTO> updateSupplier(
            @PathVariable Long id, @Valid @RequestBody SupplierRequest request) {
        return ResponseEntity.ok(supplierService.updateSupplier(id, request));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<SupplierDTO> updateStatus(
            @PathVariable Long id, @RequestBody Map<String, String> statusUpdate) {
        String status = statusUpdate.get("status");
        if (status == null || status.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(supplierService.setSupplierStatus(id, status));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSupplier(@PathVariable Long id) {
        supplierService.deleteSupplier(id);
        return ResponseEntity.noContent().build();
    }
}