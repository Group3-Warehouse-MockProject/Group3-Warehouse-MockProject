package com.fpt.sccw.controller;

import com.fpt.sccw.dto.request.CreateReceiptRequest;
import com.fpt.sccw.dto.request.UpdateReceiptRequest;
import com.fpt.sccw.dto.response.MovementDTO;
import com.fpt.sccw.dto.response.PageResponse;
import com.fpt.sccw.dto.response.ReceiptStatsDTO;
import com.fpt.sccw.entity.*;
import com.fpt.sccw.repository.*;
import com.fpt.sccw.service.ActivityLogService;
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

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;


@RestController
@RequestMapping("/api/receipts")
@RequiredArgsConstructor
public class WarehouseReceiptController {

    private final WarehouseReceiptRepository receiptRepository;
    private final ReceiptDetailRepository receiptDetailRepository;
    private final TransferRepository transferRepository;
    private final TransferDetailRepository transferDetailRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final InventoryRepository inventoryRepository;
    private final WarehouseRepository warehouseRepository;
    private final ActivityLogService activityLogService;
    private final PaymentRepository paymentRepository;
    private final ApprovalHistoryRepository approvalHistoryRepository;
    private final ApplicationEventPublisher eventPublisher;

    private static final DateTimeFormatter DATE_FMT     = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATETIME_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/receipts
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Returns movements (Inbound + Outbound) from WarehouseReceipt + Transfer.
     * Query params:
     *   warehouseIdParam — filter by warehouse (Admin/Manager only)
     *   type             — "INBOUND" or "OUTBOUND"
     */
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<PageResponse<MovementDTO>> getReceipts(
            @RequestParam(required = false) Long warehouseIdParam,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String staffName,
            @RequestParam(required = false) String assignedUserName,
            @RequestParam(required = false) Long qtyMin,
            @RequestParam(required = false) Long qtyMax,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo
    ) {
        User user = resolveUser();
        if (user == null) return ResponseEntity.status(401).build();

        String roleName = user.getRole().getRoleName().name();
        Long effectiveWarehouseId = resolveWarehouseScope(user, roleName, warehouseIdParam);

        if (page < 0 || size < 1 || size > 100) return ResponseEntity.badRequest().build();

        Status.TransactionType receiptType = null;
        if (type != null && !type.isBlank()) {
            try {
                receiptType = Status.TransactionType.valueOf(type.toUpperCase());
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().build();
            }
        }
        
        Status.ReceiptStatus receiptStatus = null;
        if (status != null && !status.isBlank()) {
            try {
                receiptStatus = Status.ReceiptStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().build();
            }
        }
        
        java.time.LocalDateTime ldtFrom = null;
        if (dateFrom != null && !dateFrom.isBlank()) {
            try {
                ldtFrom = java.time.LocalDate.parse(dateFrom).atStartOfDay();
            } catch (Exception ex) {
                // ignore invalid format
            }
        }
        java.time.LocalDateTime ldtTo = null;
        if (dateTo != null && !dateTo.isBlank()) {
            try {
                ldtTo = java.time.LocalDate.parse(dateTo).atTime(23, 59, 59);
            } catch (Exception ex) {
                // ignore invalid format
            }
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "receipt.createdAt"));
        Page<ReceiptDetail> detailPage = receiptDetailRepository
                .findMovementPageFiltered(effectiveWarehouseId, receiptType, search, receiptStatus, staffName, assignedUserName, qtyMin, qtyMax, ldtFrom, ldtTo, pageable);

        List<MovementDTO> pageContent = detailPage.getContent().stream()
                .map(detail -> {
                    WarehouseReceipt receipt = detail.getReceipt();
                    boolean isInbound = receipt.getType() == Status.TransactionType.INBOUND;
                    return buildReceiptMovement(receipt, detail, isInbound,
                            resolvePartner(receipt, detail, isInbound));
                })
                .toList();

        return ResponseEntity.ok(new PageResponse<>(pageContent, detailPage));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/receipts/stats
    // ─────────────────────────────────────────────────────────────────────────
    @GetMapping("/stats")
    @Transactional(readOnly = true)
    public ResponseEntity<ReceiptStatsDTO> getReceiptStats(
            @RequestParam(required = false) Long warehouseIdParam,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String staffName,
            @RequestParam(required = false) String assignedUserName,
            @RequestParam(required = false) Long qtyMin,
            @RequestParam(required = false) Long qtyMax,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo
    ) {
        User user = resolveUser();
        if (user == null) return ResponseEntity.status(401).build();

        String roleName = user.getRole().getRoleName().name();
        Long effectiveWarehouseId = resolveWarehouseScope(user, roleName, warehouseIdParam);

        Status.TransactionType receiptType = null;
        if (type != null && !type.isBlank()) {
            try {
                receiptType = Status.TransactionType.valueOf(type.toUpperCase());
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().build();
            }
        }

        Status.ReceiptStatus receiptStatus = null;
        if (status != null && !status.isBlank()) {
            try {
                receiptStatus = Status.ReceiptStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException ex) {
                return ResponseEntity.badRequest().build();
            }
        }

        java.time.LocalDateTime ldtFrom = null;
        if (dateFrom != null && !dateFrom.isBlank()) {
            try {
                ldtFrom = java.time.LocalDate.parse(dateFrom).atStartOfDay();
            } catch (Exception ex) {}
        }
        java.time.LocalDateTime ldtTo = null;
        if (dateTo != null && !dateTo.isBlank()) {
            try {
                ldtTo = java.time.LocalDate.parse(dateTo).atTime(23, 59, 59);
            } catch (Exception ex) {}
        }

        List<ReceiptDetail> details = receiptDetailRepository
                .findAllMovementsFiltered(effectiveWarehouseId, receiptType, search, receiptStatus, staffName, assignedUserName, qtyMin, qtyMax, ldtFrom, ldtTo);

        java.util.Set<Long> uniqueReceiptIds = new java.util.HashSet<>();
        java.util.Set<String> uniquePartners = new java.util.HashSet<>();
        long totalUnits = 0;
        BigDecimal totalRevenue = BigDecimal.ZERO;
        long pendingRequests = 0;
        long approvedRequests = 0;
        java.util.Set<Long> pendingReceiptIds = new java.util.HashSet<>();
        java.util.Set<Long> approvedReceiptIds = new java.util.HashSet<>();

        for (ReceiptDetail d : details) {
            WarehouseReceipt r = d.getReceipt();
            boolean isInbound = r.getType() == Status.TransactionType.INBOUND;
            uniqueReceiptIds.add(r.getId());

            if (isInbound) {
                if (d.getQuantity() != null) {
                    totalUnits += d.getQuantity();
                }
                String partner = resolvePartner(r, d, true);
                if (partner != null && !partner.isBlank() && !"—".equals(partner)) {
                    uniquePartners.add(partner.trim());
                }
            } else {
                if (r.getStatus() == Status.ReceiptStatus.PENDING) {
                    pendingReceiptIds.add(r.getId());
                } else if (r.getStatus() == Status.ReceiptStatus.APPROVED) {
                    approvedReceiptIds.add(r.getId());
                } else if (r.getStatus() == Status.ReceiptStatus.COMPLETED) {
                    if (d.getPrice() != null && d.getQuantity() != null) {
                        totalRevenue = totalRevenue.add(d.getPrice().multiply(BigDecimal.valueOf(d.getQuantity())));
                    }
                }
            }
        }

        pendingRequests = pendingReceiptIds.size();
        approvedRequests = approvedReceiptIds.size();

        ReceiptStatsDTO dto = ReceiptStatsDTO.builder()
                .totalReceipts(uniqueReceiptIds.size())
                .totalUnits(totalUnits)
                .totalPartners(uniquePartners.size())
                .totalRevenue(totalRevenue)
                .pendingRequests(pendingRequests)
                .approvedRequests(approvedRequests)
                .build();

        return ResponseEntity.ok(dto);
    }


    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/receipts
    // ─────────────────────────────────────────────────────────────────────────

    @PostMapping
    @Transactional
    public ResponseEntity<?> createReceipt(@RequestBody CreateReceiptRequest request) {
        User user = resolveUser();
        if (user == null) return ResponseEntity.status(401).build();

        if (request.getWarehouseId() == null)
            return ResponseEntity.badRequest().body("warehouseId is required");
        if (request.getItems() == null || request.getItems().isEmpty())
            return ResponseEntity.badRequest().body("At least one item is required");

        Warehouse warehouse = warehouseRepository.findById(request.getWarehouseId()).orElse(null);
        if (warehouse == null) return ResponseEntity.badRequest().body("Warehouse not found");

        if (!"INBOUND".equalsIgnoreCase(request.getType())
                && !"OUTBOUND".equalsIgnoreCase(request.getType())) {
            return ResponseEntity.badRequest().body("Type must be INBOUND or OUTBOUND");
        }

        boolean isInbound = "INBOUND".equalsIgnoreCase(request.getType());
        Status.TransactionType txType = isInbound
                ? Status.TransactionType.INBOUND : Status.TransactionType.OUTBOUND;

        User assignedUser = null;
        if (request.getAssignedUserId() != null) {
            assignedUser = userRepository.findById(request.getAssignedUserId()).orElse(null);
        }

        WarehouseReceipt receipt = WarehouseReceipt.builder()
                .type(txType)
                .status(Status.ReceiptStatus.PENDING)
                .remark(request.getRemark())
                .partner(request.getPartner())
                .user(user)
                .assignedUser(assignedUser)
                .warehouse(warehouse)
                .paymentTerm(resolvePaymentTerm(request.getPaymentTerm(), !isInbound))
                .paymentStatus(Status.PaymentStatus.UNPAID)
                .build();

        Set<ReceiptDetail> details = new java.util.LinkedHashSet<>();
        for (CreateReceiptRequest.LineItemRequest item : request.getItems()) {
            if (item == null || item.getProductCode() == null || item.getProductCode().isBlank()) {
                return ResponseEntity.badRequest().body("Product code is required");
            }
            if (item.getQuantity() == null || item.getQuantity() <= 0) {
                return ResponseEntity.badRequest().body("Invalid quantity for product: " + item.getProductCode());
            }

            Product product = productRepository.findByCode(item.getProductCode()).orElse(null);
            if (product == null)
                return ResponseEntity.badRequest().body("Product not found: " + item.getProductCode());

            BigDecimal resolvedPrice = item.getPrice() != null ? item.getPrice()
                    : (isInbound ? product.getCost() : product.getPrice());

            details.add(ReceiptDetail.builder()
                    .receipt(receipt)
                    .product(product)
                    .quantity(item.getQuantity())
                    .price(resolvedPrice)
                    .build());

            // Inventory for inbound will be adjusted when status is updated to APPROVED.
        }

        receipt.setDetails(details);
        WarehouseReceipt saved = receiptRepository.save(receipt);

        activityLogService.log(user, isInbound ? "CREATE_INBOUND" : "CREATE_OUTBOUND",
                "Created " + (isInbound ? "inbound" : "outbound") + " receipt #" + saved.getId()
                + " at " + warehouse.getCode());

        ApprovalHistory history = ApprovalHistory.builder()
                .documentId(saved.getId())
                .documentType(Status.DocumentType.WAREHOUSE_RECEIPT)
                .newStatus(saved.getStatus().name())
                .note((isInbound ? "Inbound" : "Outbound") + " receipt created")
                .approverId(user.getId())
                .approverName(user.getFullName())
                .build();
        approvalHistoryRepository.save(history);

        if (assignedUser != null) {
            NotificationEventDTO event = NotificationEventDTO.builder()
                    .id(java.util.UUID.randomUUID().toString())
                    .userId(assignedUser.getId().toString())
                    .title("New Assignment")
                    .message("You have been assigned to a new " + (isInbound ? "Inbound" : "Outbound") + " receipt #" + saved.getId())
                    .type("INFO")
                    .createdAt(java.time.Instant.now().toString())
                    .build();
            eventPublisher.publishEvent(event);
        }

        List<MovementDTO> result = new ArrayList<>();
        for (ReceiptDetail d : saved.getDetails()) {
            result.add(buildReceiptMovement(saved, d, isInbound, resolvePartner(saved, d, isInbound)));
        }
        return ResponseEntity.status(201).body(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // PATCH /api/receipts/{receiptId}
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Update status and/or remark of a receipt.
     * Allowed roles: ADMIN, MANAGER, WAREHOUSE_MANAGER
     */
    @PatchMapping("/{receiptId}")
    @Transactional
    public ResponseEntity<?> updateReceipt(
            @PathVariable Long receiptId,
            @RequestBody UpdateReceiptRequest request
    ) {
        User user = resolveUser();
        if (user == null) return ResponseEntity.status(401).build();

        String roleName = user.getRole().getRoleName().name();
        if (!roleName.equals("ADMIN") && !roleName.equals("MANAGER") && !roleName.equals("WAREHOUSE_MANAGER")) {
            return ResponseEntity.status(403).body("Insufficient permissions");
        }

        WarehouseReceipt receipt = receiptRepository.findById(receiptId).orElse(null);
        if (receipt == null) return ResponseEntity.notFound().build();

        // Capture old status BEFORE any changes
        String oldStatus = receipt.getStatus().name();

        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            Status.ReceiptStatus newStatus;
            try {
                newStatus = Status.ReceiptStatus.valueOf(request.getStatus().toUpperCase());
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body("Invalid status: " + request.getStatus());
            }

            boolean isReceiptInbound = receipt.getType() == Status.TransactionType.INBOUND;

            if (isReceiptInbound) {
                if (receipt.getStatus() != Status.ReceiptStatus.PENDING && receipt.getStatus() != newStatus) {
                    return ResponseEntity.badRequest()
                            .body("Cannot change status of a finalized inbound receipt (" + receipt.getStatus() + ")");
                }
                
                if (receipt.getStatus() == Status.ReceiptStatus.PENDING && newStatus == Status.ReceiptStatus.APPROVED) {
                    Warehouse warehouse = receipt.getWarehouse();
                    for (ReceiptDetail d : receipt.getDetails()) {
                        adjustInventory(d.getProduct(), warehouse, d.getQuantity(), true);
                    }
                }
                
                receipt.setStatus(newStatus);
            } else {
                Status.ReceiptStatus currentStatus = receipt.getStatus();
                if (currentStatus == Status.ReceiptStatus.PENDING) {
                    if (newStatus != Status.ReceiptStatus.APPROVED && newStatus != Status.ReceiptStatus.REJECTED && newStatus != Status.ReceiptStatus.PENDING) {
                        return ResponseEntity.badRequest().body("Pending outbound requests can only be transitioned to APPROVED or REJECTED");
                    }
                    receipt.setStatus(newStatus);
                } else if (currentStatus == Status.ReceiptStatus.APPROVED) {
                    if (newStatus == Status.ReceiptStatus.COMPLETED) {
                        if (receipt.getPaymentTerm() == Status.PaymentTerm.PREPAID
                                && receipt.getPaymentStatus() != Status.PaymentStatus.PAID) {
                            return ResponseEntity.badRequest()
                                    .body("Prepaid outbound order must be fully paid before completion");
                        }
                        Warehouse warehouse = receipt.getWarehouse();
                        // Verify inventory for all items
                        for (ReceiptDetail d : receipt.getDetails()) {
                            List<Inventory> invList = inventoryRepository
                                    .findAllByProductIdAndWarehouseId(d.getProduct().getId(), warehouse.getId());
                            long totalAvailable = invList.stream().mapToLong(i -> i.getQuantity() != null ? i.getQuantity() : 0L).sum();
                            if (invList.isEmpty() || totalAvailable < d.getQuantity()) {
                                receipt.setStatus(Status.ReceiptStatus.CANCELLED);
                                receiptRepository.save(receipt);
                                return ResponseEntity.badRequest().body("Insufficient inventory for product: " + d.getProduct().getCode() + " (Required: " + d.getQuantity() + ", Available: " + totalAvailable + "). Outbound request cancelled.");
                            }
                        }
                        // Subtract inventory
                        for (ReceiptDetail d : receipt.getDetails()) {
                            adjustInventory(d.getProduct(), warehouse, d.getQuantity(), false);
                        }
                        receipt.setStatus(Status.ReceiptStatus.COMPLETED);
                    } else if (newStatus == Status.ReceiptStatus.CANCELLED) {
                        receipt.setStatus(Status.ReceiptStatus.CANCELLED);
                    } else if (newStatus != Status.ReceiptStatus.APPROVED) {
                        return ResponseEntity.badRequest().body("Approved outbound requests can only be transitioned to COMPLETED or CANCELLED");
                    }
                } else {
                    if (currentStatus != newStatus) {
                        return ResponseEntity.badRequest()
                                .body("Cannot change status of a finalized outbound receipt (" + currentStatus + ")");
                    }
                }
            }
        }
        if (request.getRemark() != null) {
            receipt.setRemark(request.getRemark().isBlank() ? null : request.getRemark());
        }

        // Update warehouse (only when PENDING)
        if (request.getWarehouseId() != null) {
            if (receipt.getStatus() != Status.ReceiptStatus.PENDING) {
                return ResponseEntity.badRequest().body("Cannot change warehouse of a finalized receipt");
            }
            Warehouse newWarehouse = warehouseRepository.findById(request.getWarehouseId()).orElse(null);
            if (newWarehouse == null) {
                return ResponseEntity.badRequest().body("Warehouse not found: " + request.getWarehouseId());
            }
            receipt.setWarehouse(newWarehouse);
        }

        // Update partner
        if (request.getPartner() != null) {
            receipt.setPartner(request.getPartner().isBlank() ? null : request.getPartner());
        }

        // Update assigned user
        if (request.getAssignedUserId() != null) {
            if (request.getAssignedUserId() <= 0) {
                receipt.setAssignedUser(null);
            } else {
                User assignedUser = userRepository.findById(request.getAssignedUserId()).orElse(null);
                if (assignedUser == null) {
                    return ResponseEntity.badRequest().body("Assigned user not found: " + request.getAssignedUserId());
                }
                receipt.setAssignedUser(assignedUser);
            }
        }

        // Update items (only when PENDING)
        if (request.getItems() != null) {
            if (receipt.getStatus() != Status.ReceiptStatus.PENDING) {
                return ResponseEntity.badRequest().body("Cannot modify items of a finalized receipt");
            }
            if (request.getItems().isEmpty()) {
                return ResponseEntity.badRequest().body("At least one item is required");
            }

            boolean isInboundReceipt = receipt.getType() == Status.TransactionType.INBOUND;
            List<ReceiptDetail> newDetails = new ArrayList<>();

            for (CreateReceiptRequest.LineItemRequest item : request.getItems()) {
                if (item == null || item.getProductCode() == null || item.getProductCode().isBlank()) {
                    return ResponseEntity.badRequest().body("Product code is required");
                }
                if (item.getQuantity() == null || item.getQuantity() <= 0) {
                    return ResponseEntity.badRequest().body("Invalid quantity for product: " + item.getProductCode());
                }

                Product product = productRepository.findByCode(item.getProductCode()).orElse(null);
                if (product == null) {
                    return ResponseEntity.badRequest().body("Product not found: " + item.getProductCode());
                }

                BigDecimal resolvedPrice = item.getPrice() != null ? item.getPrice()
                        : (isInboundReceipt ? product.getCost() : product.getPrice());

                newDetails.add(ReceiptDetail.builder()
                        .receipt(receipt)
                        .product(product)
                        .quantity(item.getQuantity())
                        .price(resolvedPrice)
                        .build());
            }

            receipt.getDetails().clear();
            receipt.getDetails().addAll(newDetails);
        }

        WarehouseReceipt saved = receiptRepository.save(receipt);

        if (!oldStatus.equals(saved.getStatus().name())) {
            ApprovalHistory history = ApprovalHistory.builder()
                    .documentId(saved.getId())
                    .documentType(Status.DocumentType.WAREHOUSE_RECEIPT)
                    .oldStatus(oldStatus)
                    .newStatus(saved.getStatus().name())
                    .note(request.getRemark() != null && !request.getRemark().isBlank() ? request.getRemark() : "Status updated to " + saved.getStatus().name())
                    .approverId(user.getId())
                    .approverName(user.getFullName())
                    .build();
            approvalHistoryRepository.save(history);

            if (saved.getAssignedUser() != null) {
                NotificationEventDTO event = NotificationEventDTO.builder()
                        .id(java.util.UUID.randomUUID().toString())
                        .userId(saved.getAssignedUser().getId().toString())
                        .title("Receipt Status Updated")
                        .message("Receipt #" + saved.getId() + " status was updated to " + saved.getStatus().name())
                        .type("INFO")
                        .createdAt(java.time.Instant.now().toString())
                        .build();
                eventPublisher.publishEvent(event);
            }
        }

        // Log the update
        activityLogService.log(user, "UPDATE_RECEIPT",
                "Updated receipt #" + saved.getId() + ": status=" + saved.getStatus().name()
                + ", type=" + saved.getType().name());

        // Return updated movements for this receipt
        boolean isInbound = saved.getType().name().equals("INBOUND");
        List<MovementDTO> result = new ArrayList<>();
        for (ReceiptDetail d : saved.getDetails()) {
            result.add(buildReceiptMovement(saved, d, isInbound, resolvePartner(saved, d, isInbound)));
        }
        return ResponseEntity.ok(result);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE /api/receipts/{receiptId}
    // ─────────────────────────────────────────────────────────────────────────
    /**
     * Delete a receipt (cascades to details) and rolls back inventory.
     * Allowed roles: ADMIN, MANAGER
     */
    @DeleteMapping("/{receiptId}")
    @Transactional
    public ResponseEntity<?> deleteReceipt(@PathVariable Long receiptId) {
        User user = resolveUser();
        if (user == null) return ResponseEntity.status(401).build();

        String roleName = user.getRole().getRoleName().name();
        if (!roleName.equals("ADMIN") && !roleName.equals("MANAGER")) {
            return ResponseEntity.status(403).body("Insufficient permissions to perform this action.");
        }

        WarehouseReceipt receipt = receiptRepository.findById(receiptId).orElse(null);
        if (receipt == null) return ResponseEntity.notFound().build();

        boolean isInbound = receipt.getType().name().equals("INBOUND");
        Warehouse warehouse = receipt.getWarehouse();

        // Delete associated payments and approval history first to avoid orphaned records.
        paymentRepository.deleteByReceiptId(receiptId);
        approvalHistoryRepository.deleteByDocumentIdAndDocumentType(
                receiptId, Status.DocumentType.WAREHOUSE_RECEIPT);

        // Rollback inventory
        for (ReceiptDetail d : receipt.getDetails()) {
            if (isInbound) {
                if (receipt.getStatus() == Status.ReceiptStatus.APPROVED) {
                    adjustInventory(d.getProduct(), warehouse, d.getQuantity(), false);
                }
            } else {
                if (receipt.getStatus() == Status.ReceiptStatus.COMPLETED) {
                    adjustInventory(d.getProduct(), warehouse, d.getQuantity(), true);
                }
            }
        }

        receiptRepository.delete(receipt);

        activityLogService.log(user, "DELETE_RECEIPT",
                "Deleted " + (isInbound ? "inbound" : "outbound") + " receipt #" + receiptId
                + " at " + warehouse.getCode());

        return ResponseEntity.noContent().build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private String resolvePartner(WarehouseReceipt r, ReceiptDetail d, boolean isInbound) {
        if (r.getPartner() != null && !r.getPartner().isBlank()) return r.getPartner();
        if (isInbound && d.getProduct().getSupplier() != null) return d.getProduct().getSupplier().getName();
        return isInbound ? "Supplier" : "Customer";
    }

    private Status.PaymentTerm resolvePaymentTerm(String term, boolean outbound) {
        if (!outbound || term == null || term.isBlank()) {
            return outbound ? Status.PaymentTerm.COD : null;
        }
        try {
            return Status.PaymentTerm.valueOf(term.toUpperCase());
        } catch (IllegalArgumentException e) {
            return Status.PaymentTerm.COD;
        }
    }

    private BigDecimal calculateTotalAmount(WarehouseReceipt receipt) {
        BigDecimal total = BigDecimal.ZERO;
        for (ReceiptDetail d : receipt.getDetails()) {
            total = total.add(d.getPrice().multiply(BigDecimal.valueOf(d.getQuantity())));
        }
        return total;
    }

    private BigDecimal calculatePaidAmount(WarehouseReceipt receipt) {
        BigDecimal paid = BigDecimal.ZERO;
        for (Payment p : receipt.getPayments()) {
            paid = paid.add(p.getAmount());
        }
        return paid;
    }

    private User resolveUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        return userRepository.findByEmail(auth.getName()).orElse(null);
    }

    private Long resolveWarehouseScope(User user, String roleName, Long paramId) {
        if (roleName.equals("ADMIN") || roleName.equals("MANAGER")) return paramId;
        return user.getWarehouse() != null ? user.getWarehouse().getId() : null;
    }

    private void adjustInventory(Product product, Warehouse warehouse, Long qty, boolean add) {
        List<Inventory> invList = inventoryRepository
                .findAllByProductIdAndWarehouseId(product.getId(), warehouse.getId());

        if (add) {
            // For adding: use existing record or create new
            Inventory inv = invList.isEmpty() ? null : invList.get(0);
            if (inv != null) {
                inv.setQuantity(inv.getQuantity() + qty);
                inventoryRepository.save(inv);
            } else {
                inventoryRepository.save(Inventory.builder()
                        .product(product)
                        .warehouse(warehouse)
                        .quantity(qty)
                        .lowStockThreshold(10L)
                        .outOfStockWarningDays(3L)
                        .build());
            }
        } else {
            // For deducting: aggregate across all locations
            if (invList.isEmpty()) {
                throw new IllegalArgumentException("No inventory record found for product: " + product.getCode());
            }
            long totalAvailable = invList.stream().mapToLong(i -> i.getQuantity() != null ? i.getQuantity() : 0L).sum();
            if (totalAvailable < qty) {
                throw new IllegalArgumentException("Insufficient inventory for product: " + product.getCode()
                        + " (Required: " + qty + ", Available: " + totalAvailable + ")");
            }
            long remaining = qty;
            for (Inventory inv : invList) {
                if (remaining <= 0) break;
                long available = inv.getQuantity() != null ? inv.getQuantity() : 0L;
                long deduct = Math.min(available, remaining);
                inv.setQuantity(available - deduct);
                remaining -= deduct;
                inventoryRepository.save(inv);
            }
        }
    }

    private MovementDTO buildReceiptMovement(WarehouseReceipt r, ReceiptDetail d,
                                              boolean isInbound, String partner) {
        BigDecimal totalAmount = calculateTotalAmount(r);
        BigDecimal paidAmount = calculatePaidAmount(r);
        List<com.fpt.sccw.dto.response.ApprovalHistoryDTO> historyList = approvalHistoryRepository
                .findByDocumentIdAndDocumentTypeOrderByCreatedAtAsc(r.getId(), Status.DocumentType.WAREHOUSE_RECEIPT)
                .stream()
                .map(com.fpt.sccw.dto.response.ApprovalHistoryDTO::fromEntity)
                .collect(Collectors.toList());

        return MovementDTO.builder()
                .id("R-" + r.getId() + "-" + d.getId())
                .receiptId(r.getId())
                .type(isInbound ? "Inbound" : "Outbound")
                .sku(d.getProduct().getCode())
                .product(d.getProduct().getName())
                .partner(partner)
                .staff(r.getUser().getFullName())
                .assignedUserId(r.getAssignedUser() != null ? r.getAssignedUser().getId() : null)
                .assignedUserName(r.getAssignedUser() != null ? r.getAssignedUser().getFullName() : null)
                .warehouseId(String.valueOf(r.getWarehouse().getId()))
                .qty(d.getQuantity())
                .date(r.getCreatedAt().format(DATE_FMT))
                .status(r.getStatus().name())
                .remark(r.getRemark())
                .createdAt(r.getCreatedAt().format(DATETIME_FMT))
                .updatedAt(r.getUpdatedAt() != null ? r.getUpdatedAt().format(DATETIME_FMT) : null)
                .paymentTerm(r.getPaymentTerm() != null ? r.getPaymentTerm().name() : null)
                .paymentStatus(r.getPaymentStatus() != null ? r.getPaymentStatus().name() : null)
                .totalAmount(totalAmount)
                .paidAmount(paidAmount)
                .history(historyList)
                .build();
    }

    private MovementDTO buildTransferMovement(Transfer t, TransferDetail d,
                                               boolean isOut, Long scopeWarehouseId, String partner) {
        String warehouseId = isOut
                ? String.valueOf(t.getWarehouse().getId())
                : (t.getWarehouseDestination() != null ? String.valueOf(t.getWarehouseDestination().getId()) : "");
        List<com.fpt.sccw.dto.response.ApprovalHistoryDTO> historyList = approvalHistoryRepository
                .findByDocumentIdAndDocumentTypeOrderByCreatedAtAsc(t.getId(), Status.DocumentType.TRANSFER)
                .stream()
                .map(com.fpt.sccw.dto.response.ApprovalHistoryDTO::fromEntity)
                .collect(Collectors.toList());

        return MovementDTO.builder()
                .id("T-" + t.getId() + "-" + d.getId())
                .type(isOut ? "Outbound" : "Inbound")
                .sku(d.getProduct().getCode())
                .product(d.getProduct().getName())
                .partner("Transfer to " + partner)
                .staff(t.getCreatedByUser().getFullName())
                .warehouseId(warehouseId)
                .qty(d.getQuantity())
                .date(t.getCreatedAt().format(DATE_FMT))
                .createdAt(t.getCreatedAt().format(DATETIME_FMT))
                .updatedAt(t.getUpdatedAt() != null ? t.getUpdatedAt().format(DATETIME_FMT) : null)
                .history(historyList)
                .build();
    }
}
