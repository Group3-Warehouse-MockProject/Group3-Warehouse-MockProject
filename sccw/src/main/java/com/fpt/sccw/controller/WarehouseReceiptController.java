package com.fpt.sccw.controller;

import com.fpt.sccw.dto.request.CreateReceiptRequest;
import com.fpt.sccw.dto.request.UpdateReceiptRequest;
import com.fpt.sccw.dto.response.MovementDTO;
import com.fpt.sccw.entity.*;
import com.fpt.sccw.repository.*;
import com.fpt.sccw.service.ActivityLogService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;


@RestController
@RequestMapping("/api/receipts")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class WarehouseReceiptController {

    private final WarehouseReceiptRepository receiptRepository;
    private final TransferRepository transferRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final InventoryRepository inventoryRepository;
    private final WarehouseRepository warehouseRepository;
    private final ActivityLogService activityLogService;

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
    public ResponseEntity<List<MovementDTO>> getReceipts(
            @RequestParam(required = false) Long warehouseIdParam,
            @RequestParam(required = false) String type
    ) {
        User user = resolveUser();
        if (user == null) return ResponseEntity.status(401).build();

        String roleName = user.getRole().getRoleName().name();
        Long effectiveWarehouseId = resolveWarehouseScope(user, roleName, warehouseIdParam);

        List<WarehouseReceipt> receipts = effectiveWarehouseId != null
                ? receiptRepository.findByWarehouseId(effectiveWarehouseId)
                : receiptRepository.findAll();

        List<Transfer> transfers = effectiveWarehouseId != null
                ? transferRepository.findByWarehouseIdOrWarehouseDestinationId(effectiveWarehouseId, effectiveWarehouseId)
                : transferRepository.findAll();

        List<MovementDTO> movements = new ArrayList<>();

        for (WarehouseReceipt r : receipts) {
            boolean isInbound = r.getType().name().equals("INBOUND");
            if (type != null && !type.isBlank() && !r.getType().name().equalsIgnoreCase(type)) continue;

            for (ReceiptDetail d : r.getDetails()) {
                String partner = resolvePartner(r, d, isInbound);
                movements.add(buildReceiptMovement(r, d, isInbound, partner));
            }
        }

        boolean includeTransfers = type == null || type.isBlank();
        if (includeTransfers) {
            for (Transfer t : transfers) {
                boolean isOut = effectiveWarehouseId == null || t.getWarehouse().getId().equals(effectiveWarehouseId);
                String partner = t.getWarehouseDestination() != null
                        ? t.getWarehouseDestination().getLocation() : "External";
                for (TransferDetail d : t.getDetails()) {
                    movements.add(buildTransferMovement(t, d, isOut, effectiveWarehouseId, partner));
                }
            }
        }

        movements.sort((a, b) -> {
            String timeA = a.getCreatedAt() != null ? a.getCreatedAt() : "";
            String timeB = b.getCreatedAt() != null ? b.getCreatedAt() : "";
            int cmp = timeB.compareTo(timeA);
            if (cmp != 0) return cmp;
            return b.getId().compareTo(a.getId()); // fallback
        });
        return ResponseEntity.ok(movements);
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

        boolean isInbound = "INBOUND".equalsIgnoreCase(request.getType());
        Status.TransactionType txType = isInbound
                ? Status.TransactionType.INBOUND : Status.TransactionType.OUTBOUND;

        WarehouseReceipt receipt = WarehouseReceipt.builder()
                .type(txType)
                .status(Status.ReceiptStatus.PENDING)
                .remark(request.getRemark())
                .partner(request.getPartner())
                .user(user)
                .warehouse(warehouse)
                .build();

        List<ReceiptDetail> details = new ArrayList<>();
        for (CreateReceiptRequest.LineItemRequest item : request.getItems()) {
            if (item.getProductCode() == null || item.getProductCode().isBlank()) continue;
            if (item.getQuantity() == null || item.getQuantity() <= 0) continue;

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

            if (isInbound) {
                adjustInventory(product, warehouse, item.getQuantity(), true);
            }
        }

        receipt.setDetails(details);
        WarehouseReceipt saved = receiptRepository.save(receipt);

        activityLogService.log(user, isInbound ? "CREATE_INBOUND" : "CREATE_OUTBOUND",
                "Created " + (isInbound ? "inbound" : "outbound") + " receipt #" + saved.getId()
                + " at " + warehouse.getCode());

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
                        Warehouse warehouse = receipt.getWarehouse();
                        // Verify inventory for all items
                        for (ReceiptDetail d : receipt.getDetails()) {
                            Inventory inv = inventoryRepository
                                    .findByProductIdAndWarehouseId(d.getProduct().getId(), warehouse.getId())
                                    .orElse(null);
                            if (inv == null || inv.getQuantity() < d.getQuantity()) {
                                receipt.setStatus(Status.ReceiptStatus.CANCELLED);
                                receiptRepository.save(receipt);
                                return ResponseEntity.badRequest().body("Insufficient inventory for product: " + d.getProduct().getCode() + " (Required: " + d.getQuantity() + "). Outbound request cancelled.");
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


        WarehouseReceipt saved = receiptRepository.save(receipt);

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
            return ResponseEntity.status(403).body("Insufficient permissions — Admin or Manager required");
        }

        WarehouseReceipt receipt = receiptRepository.findById(receiptId).orElse(null);
        if (receipt == null) return ResponseEntity.notFound().build();

        boolean isInbound = receipt.getType().name().equals("INBOUND");
        Warehouse warehouse = receipt.getWarehouse();

        // Rollback inventory
        for (ReceiptDetail d : receipt.getDetails()) {
            if (isInbound) {
                adjustInventory(d.getProduct(), warehouse, d.getQuantity(), false);
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
        Inventory inv = inventoryRepository
                .findByProductIdAndWarehouseId(product.getId(), warehouse.getId())
                .orElse(null);

        if (inv != null) {
            long newQty = add
                    ? inv.getQuantity() + qty
                    : Math.max(0, inv.getQuantity() - qty);
            inv.setQuantity(newQty);
            inventoryRepository.save(inv);
        } else if (add) {
            inventoryRepository.save(Inventory.builder()
                    .product(product)
                    .warehouse(warehouse)
                    .quantity(qty)
                    .lowStockThreshold(0L)
                    .build());
        }
    }

    private MovementDTO buildReceiptMovement(WarehouseReceipt r, ReceiptDetail d,
                                              boolean isInbound, String partner) {
        return MovementDTO.builder()
                .id("R-" + r.getId() + "-" + d.getId())
                .receiptId(r.getId())
                .type(isInbound ? "Inbound" : "Outbound")
                .sku(d.getProduct().getCode())
                .product(d.getProduct().getName())
                .partner(partner)
                .staff(r.getUser().getFullName())
                .warehouseId(String.valueOf(r.getWarehouse().getId()))
                .qty(d.getQuantity())
                .date(r.getCreatedAt().format(DATE_FMT))
                .status(r.getStatus().name())
                .remark(r.getRemark())
                .createdAt(r.getCreatedAt().format(DATETIME_FMT))
                .updatedAt(r.getUpdatedAt() != null ? r.getUpdatedAt().format(DATETIME_FMT) : null)
                .build();
    }

    private MovementDTO buildTransferMovement(Transfer t, TransferDetail d,
                                               boolean isOut, Long scopeWarehouseId, String partner) {
        String warehouseId = isOut
                ? String.valueOf(t.getWarehouse().getId())
                : (t.getWarehouseDestination() != null ? String.valueOf(t.getWarehouseDestination().getId()) : "");
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
                .build();
    }
}
