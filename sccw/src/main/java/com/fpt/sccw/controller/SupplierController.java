package com.fpt.sccw.controller;

import com.fpt.sccw.entity.Supplier;
import com.fpt.sccw.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
@CrossOrigin(origins = "*")
public class SupplierController {

    private final SupplierRepository supplierRepository;

    @GetMapping
    public ResponseEntity<PageResponse<SupplierDTO>> getAllSuppliers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        if (page < 0 || size < 1 || size > 100) return ResponseEntity.badRequest().build();

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "name"));
        Page<Supplier> suppliers = supplierRepository.findAll(pageable);
        List<SupplierDTO> content = suppliers.getContent().stream()
                .map(SupplierDTO::fromEntity)
                .toList();
        return ResponseEntity.ok(new PageResponse<>(content, suppliers));
    }

    // Tạo mới nhà cung cấp (Đã bổ sung nhận đủ rating và onTimeDelivery từ Entity)
    @PostMapping
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