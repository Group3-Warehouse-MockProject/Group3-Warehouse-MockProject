package com.fpt.sccw.controller;

import com.fpt.sccw.entity.Supplier;
import com.fpt.sccw.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Map;
import com.fpt.sccw.dto.response.SupplierDTO;
import com.fpt.sccw.dto.response.PageResponse;

@RestController
@RequestMapping("/api/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierRepository supplierRepository;

    @GetMapping
    public ResponseEntity<PageResponse<SupplierDTO>> getAllSuppliers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String country,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        if (page < 0 || size < 1 || size > 100) return ResponseEntity.badRequest().build();

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "name"));
        Page<Supplier> suppliers = supplierRepository.findSuppliersFiltered(search, status, country, pageable);
        List<SupplierDTO> content = suppliers.getContent().stream()
                .map(SupplierDTO::fromEntity)
                .toList();
        return ResponseEntity.ok(new PageResponse<>(content, suppliers));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getSupplierStats() {
        List<Supplier> all = supplierRepository.findAll();
        long totalSuppliers = all.size();
        
        double avgRating = 0.0;
        double avgOnTime = 0.0;
        long countriesCount = 0;
        
        if (totalSuppliers > 0) {
            avgRating = all.stream().mapToDouble(s -> s.getRating() != null ? s.getRating().doubleValue() : 0.0).average().orElse(0.0);
            avgOnTime = all.stream().mapToDouble(s -> s.getOnTimeDelivery() != null ? s.getOnTimeDelivery() : 0.0).average().orElse(0.0);
            countriesCount = all.stream().map(Supplier::getCountry).filter(c -> c != null && !c.isBlank()).distinct().count();
        }

        Map<String, Object> stats = new java.util.HashMap<>();
        stats.put("total", totalSuppliers);
        stats.put("avgRating", String.format(java.util.Locale.US, "%.2f", avgRating));
        stats.put("avgOnTime", Math.round(avgOnTime) + "%");
        stats.put("countriesCount", countriesCount);

        return ResponseEntity.ok(stats);
    }

    // Tạo mới nhà cung cấp (Đã bổ sung nhận đủ rating và onTimeDelivery từ Entity)
    @PostMapping
    @PreAuthorize("hasAnyAuthority('ADMIN', 'MANAGER')")
    public ResponseEntity<SupplierDTO> createSupplier(@RequestBody Supplier supplier) {
        Supplier savedSupplier = supplierRepository.save(supplier);
        return ResponseEntity.ok(SupplierDTO.fromEntity(savedSupplier));
    }

    // Cập nhật thông tin nhà cung cấp (Đã đồng bộ đầy đủ các trường mới)
    @PutMapping("/{id}")
    public ResponseEntity<SupplierDTO> updateSupplier(@PathVariable Long id, @RequestBody Supplier supplierDetails) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Supplier not found with id: " + id));

        supplier.setName(supplierDetails.getName());
        supplier.setEmail(supplierDetails.getEmail());
        supplier.setPhoneNumber(supplierDetails.getPhoneNumber());
        supplier.setAddress(supplierDetails.getAddress());
        supplier.setStatus(supplierDetails.getStatus());
        supplier.setCountry(supplierDetails.getCountry());
        
        // Cập nhật thêm rating và onTimeDelivery tránh bị mất dữ liệu
        if (supplierDetails.getRating() != null) {
            supplier.setRating(supplierDetails.getRating());
        }
        if (supplierDetails.getOnTimeDelivery() != null) {
            supplier.setOnTimeDelivery(supplierDetails.getOnTimeDelivery());
        }

        Supplier updatedSupplier = supplierRepository.save(supplier);
        return ResponseEntity.ok(SupplierDTO.fromEntity(updatedSupplier));
    }

    // Cập nhật trạng thái nhanh ACTIVE/INACTIVE (Nút Power ở Front-end)
    @PatchMapping("/{id}/status")
    public ResponseEntity<SupplierDTO> updateStatus(
            @PathVariable Long id, 
            @RequestBody Map<String, String> statusUpdate) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Supplier not found with id: " + id));

        String newStatus = statusUpdate.get("status");
        if (newStatus != null) {
            supplier.setStatus(newStatus);
        }

        Supplier updatedSupplier = supplierRepository.save(supplier);
        return ResponseEntity.ok(SupplierDTO.fromEntity(updatedSupplier));
    }

    // Xóa nhà cung cấp
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSupplier(@PathVariable Long id) {
        Supplier supplier = supplierRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Supplier not found with id: " + id));

        supplierRepository.delete(supplier);
        return ResponseEntity.noContent().build();
    }
}
