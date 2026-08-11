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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import org.springframework.context.ApplicationEventPublisher;
import com.fpt.sccw.dto.response.NotificationEventDTO;
import java.util.*;
import com.fpt.sccw.dto.response.PageResponse;

@RestController
@RequestMapping("/api/stocktake")
@RequiredArgsConstructor
public class InventoryCheckController {

    private final InventoryCheckRepository inventoryCheckRepository;
    private final UserRepository userRepository;
    private final WarehouseRepository warehouseRepository;
    private final ProductRepository productRepository;
    private final InventoryRepository inventoryRepository;
    private final ApprovalHistoryRepository approvalHistoryRepository;
    private final ApplicationEventPublisher eventPublisher;

    // ------------------------------------------------------------------
    // GET /api/stocktake  — Danh sách phiếu kiểm kê (filter theo role)
    // ------------------------------------------------------------------
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<PageResponse<InventoryCheckDTO>> getAllChecks(
            @RequestParam(required = false) Long warehouseIdParam,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        User user = getAuthenticatedUser();
        if (user == null) return ResponseEntity.status(401).build();
        if (page < 0 || size < 1 || size > 100) return ResponseEntity.badRequest().build();

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        String role = user.getRole().getRoleName().name();
        Page<InventoryCheck> checks;

        if (role.equals("ADMIN") || role.equals("MANAGER")) {
            checks = warehouseIdParam != null
                    ? inventoryCheckRepository.findByWarehouseId(warehouseIdParam, pageable)
                    : inventoryCheckRepository.findAll(pageable);
        } else {
            Long warehouseId = user.getWarehouse() != null ? user.getWarehouse().getId() : null;
            checks = warehouseId == null
                    ? Page.empty(pageable)
                    : inventoryCheckRepository.findByWarehouseId(warehouseId, pageable);
        }

        List<InventoryCheckDTO> result = checks.getContent().stream()
                .map(this::toDTO)
                .toList();

        return ResponseEntity.ok(new PageResponse<>(result, checks));
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
                .map(check -> ResponseEntity.ok(toDTO(check)))
                .orElse(ResponseEntity.notFound().build());
    }

    // ------------------------------------------------------------------
    // POST /api/stocktake  — Tạo phiếu mới (Admin / Manager / WH_Manager)
    // ------------------------------------------------------------------
    @PostMapping
    public ResponseEntity<?> createCheck(@RequestBody InventoryCheckRequest request) {
        try {
            User user = getAuthenticatedUser();
            if (user == null) {
                return ResponseEntity.status(401).body(Map.of("message", "User not authenticated"));
            }

            String role = user.getRole() != null && user.getRole().getRoleName() != null 
                    ? user.getRole().getRoleName().name() 
                    : "STAFF";

            if ("STAFF".equalsIgnoreCase(role)) {
                return ResponseEntity.status(403).body(Map.of("message", "Staff cannot create stocktake sheets"));
            }

            if (request.getWarehouseId() == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Warehouse ID is required"));
            }

            Warehouse warehouse = warehouseRepository.findById(request.getWarehouseId())
                    .orElseThrow(() -> new RuntimeException("Warehouse not found: " + request.getWarehouseId()));

            User assignedUser = null;
            if (request.getAssignedUserId() != null) {
                assignedUser = userRepository.findById(request.getAssignedUserId()).orElse(null);
            }

            if (request.getProductIds() == null || request.getProductIds().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "At least one product is required"));
            }

            List<InventoryCheckDetail> detailsList = new ArrayList<>();

            InventoryCheck check = InventoryCheck.builder()
                    .user(user)
                    .warehouse(warehouse)
                    .assignedUser(assignedUser)
                    .remark(request.getRemark())
                    .status(Status.InventoryCheckStatus.PENDING)
                    .details(detailsList)
                    .build();

            List<Inventory> invList = inventoryRepository.findByWarehouseId(warehouse.getId());

            for (Long productId : request.getProductIds()) {
                if (productId == null) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Product ID is required"));
                }

                Product product = productRepository.findById(productId).orElse(null);
                if (product == null) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Product not found: " + productId));
                }

                Long systemQty = 0L;
                if (invList != null) {
                    systemQty = invList.stream()
                            .filter(inv -> inv != null && inv.getProduct() != null && inv.getProduct().getId().equals(productId))
                            .mapToLong(Inventory::getQuantity)
                            .findFirst()
                            .orElse(0L);
                }

                InventoryCheckDetail detail = InventoryCheckDetail.builder()
                        .inventoryCheck(check)
                        .product(product)
                        .systemQuantity(systemQty)
                        .actualQuantity(0L)
                        .difference(0L)
                        .build();

                detailsList.add(detail);
            }

            InventoryCheck saved = inventoryCheckRepository.save(check);

            ApprovalHistory history = ApprovalHistory.builder()
                    .documentId(saved.getId())
                    .documentType(Status.DocumentType.INVENTORY_CHECK)
                    .newStatus(saved.getStatus().name())
                    .note("Stocktake sheet created")
                    .approverId(user.getId())
                    .approverName(user.getFullName())
                    .build();
            approvalHistoryRepository.save(history);

            if (assignedUser != null) {
                NotificationEventDTO event = NotificationEventDTO.builder()
                        .id(java.util.UUID.randomUUID().toString())
                        .userId(assignedUser.getId().toString())
                        .title("New Inventory Check")
                        .message("You have been assigned to inventory check #" + saved.getId())
                        .type("INFO")
                        .createdAt(java.time.Instant.now().toString())
                        .build();
                eventPublisher.publishEvent(event);
            }

            return ResponseEntity.ok(toDTO(saved));
        } catch (Exception e) {
            throw new RuntimeException("Unable to create the stocktake sheet. Please try again.", e);
        }
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

        String role = user.getRole() != null && user.getRole().getRoleName() != null ? user.getRole().getRoleName().name() : "";

        // STAFF chỉ được đếm khi phiếu được gán ĐÍCH DANH cho chính STAFF đó -> Chặn 403 nếu sai/chưa gán
        if ("STAFF".equalsIgnoreCase(role)) {
            if (check.getAssignedUser() == null || !check.getAssignedUser().getId().equals(user.getId())) {
                return ResponseEntity.status(403).build();
            }
        }

        if (detailRequests == null || detailRequests.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        // Frontend sends d.id = InventoryCheckDetail.id (not Product.id).
        // System quantity is a server-owned snapshot captured when the check is created.
        for (InventoryCheckRequest.DetailRequest req : detailRequests) {
            if (req == null || req.getProductId() == null || req.getActualQuantity() == null
                    || req.getActualQuantity() < 0) {
                return ResponseEntity.badRequest().build();
            }

            InventoryCheckDetail detail = check.getDetails().stream()
                    .filter(d -> d.getId().equals(req.getProductId()))
                    .findFirst()
                    .orElse(null);
            if (detail == null) {
                return ResponseEntity.badRequest().build();
            }

            detail.setActualQuantity(req.getActualQuantity());
            detail.setRemark(req.getRemark());
            // @PrePersist/@PreUpdate automatically calculates the difference.
        }

        // Tự động chuyển sang IN_PROGRESS khi bắt đầu đếm
        boolean statusChanged = false;
        String oldStatus = check.getStatus().name();
        if (check.getStatus() == Status.InventoryCheckStatus.PENDING || check.getStatus() == Status.InventoryCheckStatus.RETURNED) {
            check.setStatus(Status.InventoryCheckStatus.IN_PROGRESS);
            statusChanged = true;
        }

        InventoryCheck saved = inventoryCheckRepository.save(check);

        if (statusChanged) {
            ApprovalHistory history = ApprovalHistory.builder()
                    .documentId(saved.getId())
                    .documentType(Status.DocumentType.INVENTORY_CHECK)
                    .oldStatus(oldStatus)
                    .newStatus(saved.getStatus().name())
                    .note("Started counting")
                    .approverId(user.getId())
                    .approverName(user.getFullName())
                    .build();
            approvalHistoryRepository.save(history);

            if (check.getUser() != null) {
                NotificationEventDTO event = NotificationEventDTO.builder()
                        .id(java.util.UUID.randomUUID().toString())
                        .userId(check.getUser().getId().toString())
                        .title("Inventory Check Started")
                        .message("Staff " + user.getUsername() + " started counting for check #" + saved.getId())
                        .type("INFO")
                        .createdAt(java.time.Instant.now().toString())
                        .build();
                eventPublisher.publishEvent(event);
            }
        }

        return ResponseEntity.ok(toDTO(saved));
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

        String role = user.getRole() != null && user.getRole().getRoleName() != null ? user.getRole().getRoleName().name() : "";

        // STAFF không được đổi trạng thái
        if ("STAFF".equalsIgnoreCase(role)) return ResponseEntity.status(403).build();

        // Chỉ WAREHOUSE_MANAGER mới được đóng phiếu (COMPLETED)
        String newStatus = body.get("status");
        if (newStatus == null || newStatus.isBlank()) return ResponseEntity.badRequest().build();
        if ("COMPLETED".equals(newStatus) && !role.equals("WAREHOUSE_MANAGER")) {
            return ResponseEntity.status(403).build();
        }

        InventoryCheck check = inventoryCheckRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Stocktake not found: " + id));

        String oldStatusStr = check.getStatus().name();
        if ("COMPLETED".equals(newStatus)) {
            if (check.getDetails() == null || check.getDetails().isEmpty()
                    || check.getDetails().stream().anyMatch(d -> d.getActualQuantity() == null
                    || d.getActualQuantity() < 0)) {
                return ResponseEntity.badRequest().build();
            }
        }
        try {
            check.setStatus(Status.InventoryCheckStatus.valueOf(newStatus));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }

        InventoryCheck saved = inventoryCheckRepository.save(check);

        if (!oldStatusStr.equals(newStatus)) {
            if ("COMPLETED".equals(newStatus)) {
                Warehouse warehouse = saved.getWarehouse();
                if (warehouse != null && saved.getDetails() != null) {
                    for (InventoryCheckDetail detail : saved.getDetails()) {
                        if (detail.getProduct() == null) continue;
                        Product product = detail.getProduct();
                        Inventory inv = inventoryRepository
                                .findByWarehouseIdAndProductId(warehouse.getId(), product.getId())
                                .orElse(null);
                        if (inv != null) {
                            inv.setQuantity(detail.getActualQuantity() != null ? detail.getActualQuantity() : 0L);
                            inventoryRepository.save(inv);
                        } else {
                            inventoryRepository.save(Inventory.builder()
                                    .product(product)
                                    .warehouse(warehouse)
                                    .quantity(detail.getActualQuantity() != null ? detail.getActualQuantity() : 0L)
                                    .lowStockThreshold(10L)
                                    .outOfStockWarningDays(3L)
                                    .build());
                        }
                    }
                }
            }

            ApprovalHistory history = ApprovalHistory.builder()
                    .documentId(saved.getId())
                    .documentType(Status.DocumentType.INVENTORY_CHECK)
                    .oldStatus(oldStatusStr)
                    .newStatus(newStatus)
                    .note(body.getOrDefault("remark", "Status updated to " + newStatus))
                    .approverId(user.getId())
                    .approverName(user.getFullName())
                    .build();
            approvalHistoryRepository.save(history);

            if ("COMPLETED".equals(newStatus)) {
                if (saved.getAssignedUser() != null) {
                    NotificationEventDTO event = NotificationEventDTO.builder()
                            .id(java.util.UUID.randomUUID().toString())
                            .userId(saved.getAssignedUser().getId().toString())
                            .title("Inventory Check Completed")
                            .message("Inventory check #" + saved.getId() + " was completed and closed by Manager " + user.getUsername())
                            .type("SUCCESS")
                            .createdAt(java.time.Instant.now().toString())
                            .build();
                    eventPublisher.publishEvent(event);
                }
            } else if ("RETURNED".equals(newStatus)) {
                if (saved.getAssignedUser() != null) {
                    String reason = body.getOrDefault("remark", "Sheet returned for recount");
                    NotificationEventDTO event = NotificationEventDTO.builder()
                            .id(java.util.UUID.randomUUID().toString())
                            .userId(saved.getAssignedUser().getId().toString())
                            .title("Stocktake Returned for Recount")
                            .message("Inventory check #" + saved.getId() + " was returned for recount by " + user.getUsername() + ". Reason: " + reason)
                            .type("WARNING")
                            .createdAt(java.time.Instant.now().toString())
                            .build();
                    eventPublisher.publishEvent(event);
                }
            }
        }

        return ResponseEntity.ok(toDTO(saved));
    }

    // ------------------------------------------------------------------
    // Helper
    // ------------------------------------------------------------------
    private InventoryCheckDTO toDTO(InventoryCheck check) {
        if (check == null) return null;
        List<ApprovalHistory> histories = approvalHistoryRepository
                .findByDocumentIdAndDocumentTypeOrderByCreatedAtAsc(check.getId(), Status.DocumentType.INVENTORY_CHECK);
        check.setApprovalHistories(histories);
        return InventoryCheckDTO.fromEntity(check);
    }

    private User getAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        return userRepository.findByEmail(auth.getName()).orElse(null);
    }
}
