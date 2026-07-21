package com.fpt.sccw.controller;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fpt.sccw.dto.request.TransferRequest;
import com.fpt.sccw.dto.response.TransferDTO;
import com.fpt.sccw.entity.Inventory;
import com.fpt.sccw.entity.Product;
import com.fpt.sccw.entity.Status;
import com.fpt.sccw.entity.Transfer;
import com.fpt.sccw.entity.TransferDetail;
import com.fpt.sccw.entity.User;
import com.fpt.sccw.entity.Warehouse;
import com.fpt.sccw.repository.InventoryRepository;
import com.fpt.sccw.repository.ProductRepository;
import com.fpt.sccw.repository.TransferRepository;
import com.fpt.sccw.repository.UserRepository;
import com.fpt.sccw.repository.WarehouseRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/transfers")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TransferController {

    private final TransferRepository transferRepository;
    private final UserRepository userRepository;
    private final WarehouseRepository warehouseRepository;
    private final ProductRepository productRepository;
    private final InventoryRepository inventoryRepository;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<TransferDTO>> getTransfers(@RequestParam(required = false) Long warehouseIdParam) {
        User user = currentUser();
        String roleName = user.getRole().getRoleName().name();

        List<Transfer> transfers;
        if (roleName.equals("ADMIN") || roleName.equals("MANAGER")) {
            transfers = warehouseIdParam == null
                    ? transferRepository.findAll()
                    : transferRepository.findByWarehouseIdOrWarehouseDestinationId(warehouseIdParam, warehouseIdParam);
        } else {
            Long warehouseId = user.getWarehouse() != null ? user.getWarehouse().getId() : null;
            transfers = warehouseId == null
                    ? List.of()
                    : transferRepository.findByWarehouseIdOrWarehouseDestinationId(warehouseId, warehouseId);
        }

        List<TransferDTO> result = transfers.stream()
                .sorted(Comparator.comparing(Transfer::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .map(TransferDTO::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> createTransfer(@RequestBody TransferRequest request) {
        User user = currentUser();
        validateRequest(request, user);

        Warehouse source = warehouseRepository.findById(request.getSourceWarehouseId())
                .orElseThrow(() -> new RuntimeException("Source warehouse not found"));
        Warehouse destination = null;
        Status.TransferType transferType = parseType(request.getType());
        if (isCrossWarehouse(transferType)) {
            destination = warehouseRepository.findById(request.getDestinationWarehouseId())
                    .orElseThrow(() -> new RuntimeException("Destination warehouse not found"));
            if (source.getId().equals(destination.getId())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Destination must differ from source warehouse"));
            }
        }

        User assignee = request.getAssignedById() == null ? null : userRepository.findById(request.getAssignedById()).orElse(null);
        Transfer transfer = Transfer.builder()
                .transferType(transferType)
                .status(Status.TransactionStatus.PENDING)
                .remark(buildRemark(request))
                .warehouse(source)
                .warehouseDestination(destination)
                .createdByUser(user)
                .legacyUser(user)
                .assignedByUser(assignee)
                .details(new ArrayList<>())
                .build();

        for (TransferRequest.TransferLineRequest line : request.getLines()) {
            Product product = productRepository.findByCode(line.getSku())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + line.getSku()));
            Inventory sourceInventory = inventoryRepository.findByWarehouseIdAndProductId(source.getId(), product.getId())
                    .orElseThrow(() -> new RuntimeException("No inventory for " + line.getSku() + " in source warehouse"));
            if (sourceInventory.getQuantity() < line.getQuantity()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Not enough stock for " + line.getSku()));
            }

            TransferDetail detail = TransferDetail.builder()
                    .transfer(transfer)
                    .product(product)
                    .quantity(line.getQuantity())
                    .build();
            transfer.getDetails().add(detail);
        }

        Transfer saved = transferRepository.save(transfer);
        return ResponseEntity.ok(TransferDTO.fromEntity(saved));
    }

    @PutMapping("/{id}/status")
    @Transactional
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> request) {
        User user = currentUser();
        Transfer transfer = transferRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transfer not found"));
        ensureCanAccess(user, transfer.getWarehouse().getId());

        Status.TransactionStatus nextStatus = parseStatus(request.get("status"));
        if (transfer.getStatus() == Status.TransactionStatus.COMPLETED) {
            return ResponseEntity.badRequest().body(Map.of("message", "Completed transfers cannot be changed"));
        }

        if (nextStatus == Status.TransactionStatus.COMPLETED && isCrossWarehouse(transfer.getTransferType())) {
            applyCrossWarehouseInventory(transfer);
        }

        transfer.setStatus(nextStatus);
        Transfer saved = transferRepository.save(transfer);
        return ResponseEntity.ok(TransferDTO.fromEntity(saved));
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("Unauthenticated");
        }
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private void validateRequest(TransferRequest request, User user) {
        if (request.getSourceWarehouseId() == null) {
            throw new RuntimeException("Source warehouse is required");
        }
        if (request.getLines() == null || request.getLines().isEmpty()) {
            throw new RuntimeException("At least one transfer line is required");
        }
        for (TransferRequest.TransferLineRequest line : request.getLines()) {
            if (line.getSku() == null || line.getSku().isBlank() || line.getQuantity() == null || line.getQuantity() < 1) {
                throw new RuntimeException("Each line must include SKU and quantity greater than 0");
            }
        }
        ensureCanAccess(user, request.getSourceWarehouseId());
    }

    private void ensureCanAccess(User user, Long sourceWarehouseId) {
        String roleName = user.getRole().getRoleName().name();
        if (roleName.equals("ADMIN") || roleName.equals("MANAGER")) return;
        Long userWarehouseId = user.getWarehouse() != null ? user.getWarehouse().getId() : null;
        if (userWarehouseId == null || !userWarehouseId.equals(sourceWarehouseId)) {
            throw new RuntimeException("You cannot create or update transfers for this warehouse");
        }
    }

    private Status.TransferType parseType(String type) {
        if ("internal".equalsIgnoreCase(type) || "Internal Movement".equalsIgnoreCase(type)) {
            return Status.TransferType.INBOUND;
        }
        return Status.TransferType.OUTBOUND;
    }

    private boolean isCrossWarehouse(Status.TransferType type) {
        return type == Status.TransferType.Cross_Warehouse || type == Status.TransferType.OUTBOUND;
    }

    private Status.TransactionStatus parseStatus(String status) {
        if ("InTransit".equalsIgnoreCase(status) || "DELIVERING".equalsIgnoreCase(status)) {
            return Status.TransactionStatus.DELIVERING;
        }
        if ("Completed".equalsIgnoreCase(status) || "COMPLETED".equalsIgnoreCase(status)) {
            return Status.TransactionStatus.COMPLETED;
        }
        if ("Cancelled".equalsIgnoreCase(status) || "CANCEL".equalsIgnoreCase(status)) {
            return Status.TransactionStatus.CANCEL;
        }
        return Status.TransactionStatus.PENDING;
    }

    private String buildRemark(TransferRequest request) {
        List<String> parts = new ArrayList<>();
        if (request.getRemark() != null && !request.getRemark().isBlank()) parts.add(request.getRemark());
        if (request.getSourceLocation() != null && !request.getSourceLocation().isBlank()) parts.add("From: " + request.getSourceLocation());
        if (request.getDestinationLocation() != null && !request.getDestinationLocation().isBlank()) parts.add("To: " + request.getDestinationLocation());
        return String.join(" | ", parts);
    }

    private void applyCrossWarehouseInventory(Transfer transfer) {
        Warehouse destination = transfer.getWarehouseDestination();
        if (destination == null) {
            throw new RuntimeException("Destination warehouse is required to complete cross-warehouse transfer");
        }

        for (TransferDetail detail : transfer.getDetails()) {
            Inventory source = inventoryRepository.findByWarehouseIdAndProductId(transfer.getWarehouse().getId(), detail.getProduct().getId())
                    .orElseThrow(() -> new RuntimeException("Source inventory not found for " + detail.getProduct().getCode()));
            if (source.getQuantity() < detail.getQuantity()) {
                throw new RuntimeException("Not enough stock for " + detail.getProduct().getCode());
            }

            Inventory dest = inventoryRepository.findByWarehouseIdAndProductId(destination.getId(), detail.getProduct().getId())
                    .orElseGet(() -> Inventory.builder()
                            .warehouse(destination)
                            .product(detail.getProduct())
                            .quantity(0L)
                            .lowStockThreshold(source.getLowStockThreshold())
                            .location(null)
                            .build());

            source.setQuantity(source.getQuantity() - detail.getQuantity());
            dest.setQuantity(dest.getQuantity() + detail.getQuantity());
            inventoryRepository.save(source);
            inventoryRepository.save(dest);
        }
    }
}
