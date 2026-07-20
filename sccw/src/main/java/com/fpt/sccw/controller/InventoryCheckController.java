package com.fpt.sccw.controller;

import com.fpt.sccw.dto.request.InventoryCheckRequest;
import com.fpt.sccw.dto.response.InventoryCheckDTO;
import com.fpt.sccw.entity.*;
import com.fpt.sccw.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/stocktake")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class InventoryCheckController {

    private final InventoryCheckRepository inventoryCheckRepository;
    private final UserRepository userRepository;
    private final WarehouseRepository warehouseRepository;
    private final ProductRepository productRepository;
    private final InventoryRepository inventoryRepository;

    // ------------------------------------------------------------------
    // GET /api/stocktake  — Danh sách phiếu kiểm kê (filter theo role)
    // ------------------------------------------------------------------
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<InventoryCheckDTO>> getAllChecks(
            @RequestParam(required = false) Long warehouseIdParam) {

        User user = getAuthenticatedUser();
        if (user == null) return ResponseEntity.status(401).build();

        String role = user.getRole().getRoleName().name();
        List<InventoryCheck> checks;

        if (role.equals("ADMIN") || role.equals("MANAGER")) {
            // Admin/Manager xem tất cả hoặc filter theo kho
            checks = warehouseIdParam != null
                    ? inventoryCheckRepository.findByWarehouseId(warehouseIdParam)
                    : inventoryCheckRepository.findAll();
        } else {
            // Warehouse_Manager và Staff chỉ xem kho của mình
            Long warehouseId = user.getWarehouse() != null ? user.getWarehouse().getId() : null;
            if (warehouseId == null) return ResponseEntity.ok(List.of());
            checks = inventoryCheckRepository.findByWarehouseId(warehouseId);
        }

        List<InventoryCheckDTO> result = checks.stream()
                .map(InventoryCheckDTO::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // ------------------------------------------------------------------
    // GET /api/stocktake/{id}  — Chi tiết 1 phiếu
    // ------------------------------------------------------------------
    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<InventoryCheckDTO> getCheckById(@PathVariable Long id) {
        User user = getAuthenticatedUser();
        if (user == null) return ResponseEntity.status(401).build();

        return inventoryCheckRepository.findById(id)
                .map(check -> ResponseEntity.ok(InventoryCheckDTO.fromEntity(check)))
                .orElse(ResponseEntity.notFound().build());
    }

    // ------------------------------------------------------------------
    // POST /api/stocktake  — Tạo phiếu mới (Admin / Manager / WH_Manager)
    // ------------------------------------------------------------------
    @PostMapping
    @Transactional
    public ResponseEntity<InventoryCheckDTO> createCheck(@RequestBody InventoryCheckRequest request) {
        User user = getAuthenticatedUser();
        if (user == null) return ResponseEntity.status(401).build();

        String role = user.getRole().getRoleName().name();
        if (role.equals("STAFF")) return ResponseEntity.status(403).build();

        Warehouse warehouse = warehouseRepository.findById(request.getWarehouseId())
                .orElseThrow(() -> new RuntimeException("Warehouse not found"));

        // Tìm nhân viên được gán (nếu có)
        User assignedUser = null;
        if (request.getAssignedUserId() != null) {
            assignedUser = userRepository.findById(request.getAssignedUserId()).orElse(null);
        }

        // Tạo phiếu kiểm kê
        InventoryCheck check = InventoryCheck.builder()
                .user(user)
                .warehouse(warehouse)
                .assignedUser(assignedUser)
                .remark(request.getRemark())
                .status(Status.InventoryCheckStatus.PENDING)
                .build();

        // Tạo dòng chi tiết cho từng sản phẩm được chọn
        if (request.getProductIds() != null && !request.getProductIds().isEmpty()) {
            for (Long productId : request.getProductIds()) {
                Product product = productRepository.findById(productId)
                        .orElseThrow(() -> new RuntimeException("Product not found: " + productId));

                // Lấy số lượng hệ thống hiện tại từ inventory
                Long systemQty = inventoryRepository
                        .findByWarehouseId(warehouse.getId())
                        .stream()
                        .filter(inv -> inv.getProduct().getId().equals(productId))
                        .mapToLong(Inventory::getQuantity)
                        .findFirst()
                        .orElse(0L);

                InventoryCheckDetail detail = InventoryCheckDetail.builder()
                        .inventoryCheck(check)
                        .product(product)
                        .systemQuantity(systemQty)
                        .actualQuantity(systemQty) // Mặc định bằng system qty → variance = 0 khi chưa đếm
                        .build();

                check.getDetails().add(detail);
            }
        }

        InventoryCheck saved = inventoryCheckRepository.save(check);
        return ResponseEntity.ok(InventoryCheckDTO.fromEntity(saved));
    }

    // ------------------------------------------------------------------
    // POST /api/stocktake/{id}/details  — Staff lưu số đếm thực tế
    // ------------------------------------------------------------------
    @PostMapping("/{id}/details")
    @Transactional
    public ResponseEntity<InventoryCheckDTO> submitCounts(
            @PathVariable Long id,
            @RequestBody List<InventoryCheckRequest.DetailRequest> detailRequests) {

        User user = getAuthenticatedUser();
        if (user == null) return ResponseEntity.status(401).build();

        InventoryCheck check = inventoryCheckRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Stocktake not found: " + id));

        if (check.getStatus() == Status.InventoryCheckStatus.COMPLETED) {
            return ResponseEntity.badRequest().build();
        }

        // Cập nhật số đếm thực tế cho từng dòng sản phẩm
        // Frontend gửi d.id = InventoryCheckDetail.id (không phải Product.id)
        for (InventoryCheckRequest.DetailRequest req : detailRequests) {
            check.getDetails().stream()
                    .filter(d -> d.getId().equals(req.getProductId()))
                    .findFirst()
                    .ifPresent(d -> {
                        d.setActualQuantity(req.getActualQuantity());
                        d.setSystemQuantity(req.getSystemQuantity());
                        d.setRemark(req.getRemark());
                        // @PrePersist/@PreUpdate sẽ tự tính difference
                    });
        }

        // Tự động chuyển sang IN_PROGRESS khi bắt đầu đếm
        if (check.getStatus() == Status.InventoryCheckStatus.PENDING) {
            check.setStatus(Status.InventoryCheckStatus.IN_PROGRESS);
        }

        InventoryCheck saved = inventoryCheckRepository.save(check);
        return ResponseEntity.ok(InventoryCheckDTO.fromEntity(saved));
    }

    // ------------------------------------------------------------------
    // PUT /api/stocktake/{id}/status  — Đổi trạng thái phiếu
    // ------------------------------------------------------------------
    @PutMapping("/{id}/status")
    @Transactional
    public ResponseEntity<InventoryCheckDTO> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {

        User user = getAuthenticatedUser();
        if (user == null) return ResponseEntity.status(401).build();

        String role = user.getRole().getRoleName().name();

        // STAFF không được đổi trạng thái
        if (role.equals("STAFF")) return ResponseEntity.status(403).build();

        // Chỉ WAREHOUSE_MANAGER mới được đóng phiếu (COMPLETED)
        String newStatus = body.get("status");
        if ("COMPLETED".equals(newStatus) && !role.equals("WAREHOUSE_MANAGER")) {
            return ResponseEntity.status(403).build();
        }

        InventoryCheck check = inventoryCheckRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Stocktake not found: " + id));

        String newStatus = body.get("status");
        try {
            check.setStatus(Status.InventoryCheckStatus.valueOf(newStatus));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }

        InventoryCheck saved = inventoryCheckRepository.save(check);
        return ResponseEntity.ok(InventoryCheckDTO.fromEntity(saved));
    }

    // ------------------------------------------------------------------
    // Helper
    // ------------------------------------------------------------------
    private User getAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        return userRepository.findByEmail(auth.getName()).orElse(null);
    }
}
