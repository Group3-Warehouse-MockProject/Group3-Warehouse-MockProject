package com.fpt.sccw.controller;

import java.util.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.fpt.sccw.dto.request.TransferRequest;
import com.fpt.sccw.dto.response.PageResponse;
import com.fpt.sccw.dto.response.TransferDTO;
import com.fpt.sccw.dto.response.ApprovalHistoryDTO;
import com.fpt.sccw.dto.response.NotificationEventDTO;
import com.fpt.sccw.entity.ApprovalHistory;
import com.fpt.sccw.entity.Inventory;
import com.fpt.sccw.entity.Location;
import com.fpt.sccw.entity.Product;
import com.fpt.sccw.entity.Status;
import com.fpt.sccw.entity.Transfer;
import com.fpt.sccw.entity.TransferDetail;
import com.fpt.sccw.entity.User;
import com.fpt.sccw.entity.Warehouse;
import com.fpt.sccw.repository.ApprovalHistoryRepository;
import com.fpt.sccw.repository.InventoryRepository;
import com.fpt.sccw.repository.LocationRepository;
import com.fpt.sccw.repository.ProductRepository;
import com.fpt.sccw.repository.TransferRepository;
import com.fpt.sccw.repository.TransferDetailRepository;
import com.fpt.sccw.repository.UserRepository;
import com.fpt.sccw.repository.WarehouseRepository;
import com.fpt.sccw.service.NotificationService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/transfers")
@RequiredArgsConstructor
public class TransferController {

    private final TransferRepository transferRepository;
    private final TransferDetailRepository transferDetailRepository;
    private final UserRepository userRepository;
    private final WarehouseRepository warehouseRepository;
    private final ProductRepository productRepository;
    private final InventoryRepository inventoryRepository;
    private final LocationRepository locationRepository;
    private final ApprovalHistoryRepository approvalHistoryRepository;
    private final NotificationService notificationService;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<PageResponse<TransferDTO>> getTransfers(
            @RequestParam(required = false) Long warehouseIdParam,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        User user = currentUser();
        String roleName = user.getRole().getRoleName().name();

        Pageable pageable = PageRequest.of(
                page,
                size,
                Sort.by(Sort.Direction.DESC, "createdAt")
        );

        Page<Transfer> transferPage;
        List<Status.TransactionStatus> statusFilters = resolveStatusFilters(status);
        List<Status.TransferType> typeFilters = resolveTypeFilters(type);
        String keywordFilter = normalizeKeyword(keyword);

        if (roleName.equals("ADMIN") || roleName.equals("MANAGER")) {
            if (warehouseIdParam == null) {
                transferPage = transferRepository.findAllEagerPagedFiltered(
                        statusFilters, typeFilters, keywordFilter, pageable);
            } else {
                transferPage = transferRepository.findByWarehouseEagerPagedFiltered(
                        warehouseIdParam,
                        statusFilters,
                        typeFilters,
                        keywordFilter,
                        pageable
                );
            }
        } else {
            Long warehouseId = user.getWarehouse() != null
                    ? user.getWarehouse().getId()
                    : null;

            if (warehouseId == null) {
                transferPage = Page.empty(pageable);
            } else {
                transferPage = transferRepository.findByWarehouseEagerPagedFiltered(
                        warehouseId,
                        statusFilters,
                        typeFilters,
                        keywordFilter,
                        pageable
                );
            }
        }

        Page<TransferDTO> dtoPage = transferPage.map(TransferDTO::fromEntity);
        return ResponseEntity.ok(new PageResponse<>(dtoPage));
    }

    @GetMapping("/{id}/history")
    @Transactional(readOnly = true)
    public ResponseEntity<List<ApprovalHistoryDTO>> getTransferHistory(@PathVariable Long id) {
        User user = currentUser();
        Transfer transfer = transferRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transfer not found"));
        ensureCanAccess(user, transfer.getWarehouse().getId());

        List<ApprovalHistoryDTO> history = approvalHistoryRepository
                .findByDocumentIdAndDocumentTypeOrderByCreatedAtAsc(
                        id, Status.DocumentType.TRANSFER)
                .stream()
                .map(ApprovalHistoryDTO::fromEntity)
                .toList();

        return ResponseEntity.ok(history);
    }

    @GetMapping("/stats")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Long>> getTransferStats(
            @RequestParam(required = false) Long warehouseIdParam
    ) {
        User user = currentUser();
        String roleName = user.getRole().getRoleName().name();

        List<Transfer> transfers;
        if ("ADMIN".equals(roleName) || "MANAGER".equals(roleName)) {
            transfers = warehouseIdParam == null
                    ? transferRepository.findAll()
                    : transferRepository.findByWarehouseIdOrWarehouseDestinationId(
                            warehouseIdParam, warehouseIdParam);
        } else {
            Long warehouseId = user.getWarehouse() == null
                    ? null : user.getWarehouse().getId();
            transfers = warehouseId == null
                    ? Collections.emptyList()
                    : transferRepository.findByWarehouseIdOrWarehouseDestinationId(
                            warehouseId, warehouseId);
        }

        long pending = transfers.stream()
                .filter(transfer -> transfer.getStatus() == Status.TransactionStatus.PENDING)
                .count();
        long inTransit = transfers.stream()
                .filter(transfer -> transfer.getStatus() == Status.TransactionStatus.DELIVERING
                        || transfer.getStatus() == Status.TransactionStatus.DELIVERED)
                .count();
        long crossWarehouse = transfers.stream()
                .filter(transfer -> isCrossWarehouse(transfer.getTransferType()))
                .count();

        Map<String, Long> result = new HashMap<>();
        result.put("total", (long) transfers.size());
        result.put("pending", pending);
        result.put("inTransit", inTransit);
        result.put("crossWarehouse", crossWarehouse);
        result.put("internal", transfers.size() - crossWarehouse);
        return ResponseEntity.ok(result);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> createTransfer(@RequestBody TransferRequest request) {
        User user = currentUser();
        validateRequest(request, user);

        Warehouse source = warehouseRepository.findById(request.getSourceWarehouseId())
                .orElseThrow(() -> new RuntimeException("Source warehouse not found"));

        ensureActiveWarehouse(source, "Source");

        Warehouse destination = null;
        Status.TransferType transferType = parseType(request.getType());

        if (isCrossWarehouse(transferType)) {
            destination = warehouseRepository.findById(
                    request.getDestinationWarehouseId()
            ).orElseThrow(() ->
                    new RuntimeException("Destination warehouse not found")
            );

            ensureActiveWarehouse(destination, "Destination");

            if (source.getId().equals(destination.getId())) {
                return ResponseEntity.badRequest().body(
                        Map.of(
                                "message",
                                "Destination must differ from source warehouse"
                        )
                );
            }
        }

        User assignee = resolveAssignee(
                request.getAssignedById(),
                source,
                destination
        );
        Location[] internalLocations = resolveInternalLocations(request, source, transferType);

        Transfer transfer = Transfer.builder()
                .transferType(transferType)
                .status(Status.TransactionStatus.PENDING)
                .remark(buildRemark(request))
                .warehouse(source)
                .warehouseDestination(destination)
                .createdByUser(user)
                                .assignedByUser(assignee)
                .sourceLocation(internalLocations[0])
                .destinationLocation(internalLocations[1])
                .details(new LinkedHashSet<>())
                .build();

        addTransferDetails(transfer, source, request.getLines());

        Transfer saved = transferRepository.save(transfer);

        ApprovalHistory history = ApprovalHistory.builder()
                .documentId(saved.getId())
                .documentType(Status.DocumentType.TRANSFER)
                .newStatus(saved.getStatus().name())
                .note("Transfer created")
                .approverId(user.getId())
                .approverName(user.getFullName())
                .build();

        approvalHistoryRepository.save(history);
        notifyTransferParticipants(saved, "Transfer created", "A new transfer is ready for review.", "INFO");

        return ResponseEntity.ok(TransferDTO.fromEntity(saved));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateTransfer(
            @PathVariable Long id,
            @RequestBody TransferRequest request
    ) {
        User user = currentUser();
        Transfer transfer = transferRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transfer not found"));

        if (transfer.getStatus() != Status.TransactionStatus.PENDING) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Only pending transfers can be edited"));
        }

        ensureCanAccess(user, transfer.getWarehouse().getId());
        validateRequest(request, user);

        Warehouse source = warehouseRepository.findById(request.getSourceWarehouseId())
                .orElseThrow(() -> new RuntimeException("Source warehouse not found"));
        ensureActiveWarehouse(source, "Source");

        Status.TransferType transferType = parseType(request.getType());
        Warehouse destination = null;
        if (isCrossWarehouse(transferType)) {
            destination = warehouseRepository.findById(request.getDestinationWarehouseId())
                    .orElseThrow(() -> new RuntimeException("Destination warehouse not found"));
            ensureActiveWarehouse(destination, "Destination");
            if (source.getId().equals(destination.getId())) {
                return ResponseEntity.badRequest().body(Map.of(
                        "message", "Destination must differ from source warehouse"));
            }
        }

        User assignee = resolveAssignee(request.getAssignedById(), source, destination);
        Location[] internalLocations = resolveInternalLocations(request, source, transferType);
        transferDetailRepository.deleteByTransferId(transfer.getId());
        transfer.getDetails().clear();
        transfer.setTransferType(transferType);
        transfer.setWarehouse(source);
        transfer.setWarehouseDestination(destination);
        transfer.setAssignedByUser(assignee);
        transfer.setSourceLocation(internalLocations[0]);
        transfer.setDestinationLocation(internalLocations[1]);
        transfer.setRemark(buildRemark(request));
        addTransferDetails(transfer, source, request.getLines());

        Transfer saved = transferRepository.save(transfer);
        approvalHistoryRepository.save(ApprovalHistory.builder()
                .documentId(saved.getId())
                .documentType(Status.DocumentType.TRANSFER)
                .oldStatus(saved.getStatus().name())
                .newStatus(saved.getStatus().name())
                .note("Transfer details updated")
                .approverId(user.getId())
                .approverName(user.getFullName())
                .build());
        notifyTransferParticipants(saved, "Transfer updated", "Transfer details were updated before dispatch.", "INFO");

        return ResponseEntity.ok(TransferDTO.fromEntity(saved));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteTransfer(@PathVariable Long id) {
        User user = currentUser();
        if (!"ADMIN".equals(user.getRole().getRoleName().name())) {
            return ResponseEntity.status(403).body(Map.of(
                    "message", "Only administrators can delete transfers"));
        }

        Transfer transfer = transferRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Transfer not found"));
        if (transfer.getStatus() != Status.TransactionStatus.PENDING
                && transfer.getStatus() != Status.TransactionStatus.CANCELLED) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Only pending or cancelled transfers can be deleted"));
        }

        approvalHistoryRepository.deleteByDocumentIdAndDocumentType(
                id, Status.DocumentType.TRANSFER);
        transferDetailRepository.deleteByTransferId(id);
        transferRepository.delete(transfer);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/status")
    @Transactional
    public ResponseEntity<?> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> request
    ) {
        User user = currentUser();

        Transfer transfer = transferRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Transfer not found")
                );

        ensureCanAccess(user, transfer.getWarehouse().getId());

        Status.TransactionStatus nextStatus =
                parseStatus(request.get("status"));

        validateTransition(transfer, nextStatus);
        ensureCanTransition(user, transfer, nextStatus);

        if (transfer.getStatus() == nextStatus) {
            return ResponseEntity.ok(TransferDTO.fromEntity(transfer));
        }

        if (nextStatus == Status.TransactionStatus.CANCEL
                && isCrossWarehouse(transfer.getTransferType())
                && (transfer.getStatus() == Status.TransactionStatus.DELIVERING
                        || transfer.getStatus() == Status.TransactionStatus.DELIVERED)) {
            restoreSourceInventory(transfer);
        } else if (nextStatus == Status.TransactionStatus.DELIVERING && isCrossWarehouse(transfer.getTransferType())) {
            deductSourceInventory(transfer);
        } else if (nextStatus == Status.TransactionStatus.COMPLETED && isCrossWarehouse(transfer.getTransferType())) {
            if (transfer.getStatus() != Status.TransactionStatus.DELIVERING) {
                deductSourceInventory(transfer);
            }
            addDestinationInventory(transfer);
        } else if (nextStatus == Status.TransactionStatus.COMPLETED) {
            applyInternalMovementLocation(transfer);
        }

        String oldStatus = transfer.getStatus().name();

        transfer.setStatus(nextStatus);
        Transfer saved = transferRepository.save(transfer);

        if (!oldStatus.equals(saved.getStatus().name())) {
            ApprovalHistory history = ApprovalHistory.builder()
                    .documentId(saved.getId())
                    .documentType(Status.DocumentType.TRANSFER)
                    .oldStatus(oldStatus)
                    .newStatus(saved.getStatus().name())
                    .note(
                            "Status updated to "
                                    + saved.getStatus().name()
                    )
                    .approverId(user.getId())
                    .approverName(user.getFullName())
                    .build();

            approvalHistoryRepository.save(history);
            notifyTransferParticipants(
                    saved,
                    "Transfer " + TransferDTO.fromEntity(saved).getStatus(),
                    "Transfer " + TransferDTO.fromEntity(saved).getCode()
                            + " is now " + TransferDTO.fromEntity(saved).getStatus() + ".",
                    nextStatus == Status.TransactionStatus.COMPLETED ? "SUCCESS" : "INFO"
            );
        }

        return ResponseEntity.ok(TransferDTO.fromEntity(saved));
    }

    private User currentUser() {
        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()) {
            throw new RuntimeException("Unauthenticated");
        }

        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() ->
                        new RuntimeException("User not found")
                );
    }

    private void validateRequest(
            TransferRequest request,
            User user
    ) {
        if (request.getSourceWarehouseId() == null) {
            throw new RuntimeException("Source warehouse is required");
        }

        if (request.getLines() == null
                || request.getLines().isEmpty()) {
            throw new RuntimeException(
                    "At least one transfer line is required"
            );
        }

        for (TransferRequest.TransferLineRequest line
                : request.getLines()) {
            if (line.getSku() == null
                    || line.getSku().isBlank()
                    || line.getQuantity() == null
                    || line.getQuantity() < 1) {
                throw new RuntimeException(
                        "Each line must include SKU and quantity greater than 0"
                );
            }
        }

        ensureCanAccess(user, request.getSourceWarehouseId());
    }

    private Location[] resolveInternalLocations(
            TransferRequest request,
            Warehouse source,
            Status.TransferType transferType
    ) {
        if (isCrossWarehouse(transferType)) {
            return new Location[] { null, null };
        }

        if (request.getSourceLocationId() == null || request.getDestinationLocationId() == null) {
            throw new RuntimeException("Source and destination locations are required for internal movement");
        }

        Location sourceLocation = locationRepository.findById(request.getSourceLocationId())
                .orElseThrow(() -> new RuntimeException("Source location not found"));
        Location destinationLocation = locationRepository.findById(request.getDestinationLocationId())
                .orElseThrow(() -> new RuntimeException("Destination location not found"));

        validateLocationForWarehouse(sourceLocation, source, "Source");
        validateLocationForWarehouse(destinationLocation, source, "Destination");

        if (sourceLocation.getId().equals(destinationLocation.getId())) {
            throw new RuntimeException("Destination location must differ from source location");
        }

        return new Location[] { sourceLocation, destinationLocation };
    }

    private void validateLocationForWarehouse(Location location, Warehouse warehouse, String label) {
        if (location.getWarehouse() == null || !warehouse.getId().equals(location.getWarehouse().getId())) {
            throw new RuntimeException(label + " location must belong to the source warehouse");
        }
        if (location.getStatus() != Status.LocationStatus.ACTIVE) {
            throw new RuntimeException(label + " location is inactive");
        }
    }

    private void ensureCanAccess(
            User user,
            Long sourceWarehouseId
    ) {
        String roleName = user.getRole().getRoleName().name();

        if (roleName.equals("ADMIN")
                || roleName.equals("MANAGER")) {
            return;
        }

        Long userWarehouseId = user.getWarehouse() != null
                ? user.getWarehouse().getId()
                : null;

        if (userWarehouseId == null
                || !userWarehouseId.equals(sourceWarehouseId)) {
            throw new RuntimeException(
                    "You cannot create or update transfers for this warehouse"
            );
        }
    }

    private Status.TransferType parseType(String type) {
        if ("internal".equalsIgnoreCase(type)
                || "Internal Movement".equalsIgnoreCase(type)) {
            return Status.TransferType.INTERNAL_WAREHOUSE;
        }

        if ("cross".equalsIgnoreCase(type)
                || "Cross-Warehouse".equalsIgnoreCase(type)) {
            return Status.TransferType.CROSS_WAREHOUSE;
        }

        throw new RuntimeException(
                "Transfer type must be cross or internal"
        );
    }

    private boolean isCrossWarehouse(
            Status.TransferType type
    ) {
        return type == Status.TransferType.CROSS_WAREHOUSE
                || type == Status.TransferType.CROSS_WAREHOUSE;
    }

    private Status.TransactionStatus parseStatus(String status) {
        if ("InTransit".equalsIgnoreCase(status)
                || "DELIVERING".equalsIgnoreCase(status)) {
            return Status.TransactionStatus.DELIVERING;
        }

        if ("Completed".equalsIgnoreCase(status)
                || "COMPLETED".equalsIgnoreCase(status)) {
            return Status.TransactionStatus.COMPLETED;
        }

        if ("Cancelled".equalsIgnoreCase(status)
                || "CANCEL".equalsIgnoreCase(status)) {
            return Status.TransactionStatus.CANCELLED;
        }

        if ("Pending".equalsIgnoreCase(status)
                || "PENDING".equalsIgnoreCase(status)) {
            return Status.TransactionStatus.PENDING;
        }

        throw new RuntimeException(
                "Invalid transfer status: " + status
        );
    }

    private List<Status.TransactionStatus> resolveStatusFilters(String status) {
        if (status == null || status.isBlank()) {
            return Arrays.asList(Status.TransactionStatus.values());
        }
        if ("InTransit".equalsIgnoreCase(status)) {
            return List.of(
                    Status.TransactionStatus.DELIVERING,
                    Status.TransactionStatus.DELIVERED
            );
        }
        return List.of(parseStatus(status));
    }

    private List<Status.TransferType> resolveTypeFilters(String type) {
        if (type == null || type.isBlank()) {
            return Arrays.asList(Status.TransferType.values());
        }
        if ("cross".equalsIgnoreCase(type)
                || "Cross-Warehouse".equalsIgnoreCase(type)) {
            return List.of(
                    Status.TransferType.CROSS_WAREHOUSE,
                    Status.TransferType.CROSS_WAREHOUSE
            );
        }
        return List.of(
                Status.TransferType.INTERNAL_WAREHOUSE,
                Status.TransferType.INTERNAL_WAREHOUSE
        );
    }

    private String normalizeKeyword(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return null;
        }
        return "%" + keyword.trim().toLowerCase() + "%";
    }

    private void notifyTransferParticipants(
            Transfer transfer,
            String title,
            String message,
            String type
    ) {
        Set<Long> recipientIds = new LinkedHashSet<>();
        if (transfer.getCreatedByUser() != null) {
            recipientIds.add(transfer.getCreatedByUser().getId());
        }
        if (transfer.getAssignedByUser() != null) {
            recipientIds.add(transfer.getAssignedByUser().getId());
        }

        for (Long recipientId : recipientIds) {
            notificationService.sendNotification(recipientId.toString(),
                    NotificationEventDTO.builder()
                            .userId(recipientId.toString())
                            .title(title)
                            .message(message)
                            .type(type)
                            .createdAt(java.time.Instant.now().toString())
                            .isRead(false)
                            .build());
        }
    }

    private void addTransferDetails(
            Transfer transfer,
            Warehouse source,
            List<TransferRequest.TransferLineRequest> lines
    ) {
        Map<String, Long> quantitiesBySku = new LinkedHashMap<>();
        for (TransferRequest.TransferLineRequest line : lines) {
            quantitiesBySku.merge(line.getSku(), line.getQuantity(), Long::sum);
        }

        Map<String, Product> products = new LinkedHashMap<>();
        for (Map.Entry<String, Long> entry : quantitiesBySku.entrySet()) {
            String sku = entry.getKey();
            Product product = productRepository.findByCode(sku)
                    .orElseThrow(() -> new RuntimeException("Product not found: " + sku));
            Inventory sourceInventory = inventoryRepository
                    .findByWarehouseIdAndProductId(source.getId(), product.getId())
                    .orElseThrow(() -> new RuntimeException(
                            "No inventory for " + sku + " in source warehouse"));

            if (sourceInventory.getQuantity() < entry.getValue()) {
                throw new RuntimeException("Not enough stock for " + sku);
            }
            products.put(sku, product);
        }

        for (TransferRequest.TransferLineRequest line : lines) {
            transfer.getDetails().add(TransferDetail.builder()
                    .transfer(transfer)
                    .product(products.get(line.getSku()))
                    .quantity(line.getQuantity())
                    .build());
        }
    }

    private void validateTransition(
            Transfer transfer,
            Status.TransactionStatus nextStatus
    ) {
        Status.TransactionStatus current = transfer.getStatus();

        if (current == nextStatus) {
            return;
        }

        boolean allowed;

        if (isCrossWarehouse(transfer.getTransferType())) {
            allowed =
                    (
                            current == Status.TransactionStatus.PENDING
                                    && (
                                            nextStatus
                                                    == Status.TransactionStatus.DELIVERING
                                                    || nextStatus
                                                    == Status.TransactionStatus.CANCELLED
                                    )
                    )
                    || (
                            (
                                    current
                                            == Status.TransactionStatus.DELIVERING
                                    || current
                                            == Status.TransactionStatus.DELIVERED
                            )
                            && (
                                    nextStatus
                                            == Status.TransactionStatus.COMPLETED
                                    || nextStatus
                                            == Status.TransactionStatus.CANCELLED
                            )
                    );
        } else {
            allowed = current == Status.TransactionStatus.PENDING
                    && (
                            nextStatus
                                    == Status.TransactionStatus.COMPLETED
                                    || nextStatus
                                    == Status.TransactionStatus.CANCELLED
                    );
        }

        if (!allowed) {
            throw new RuntimeException(
                    "Invalid transfer status transition: "
                            + current
                            + " -> "
                            + nextStatus
            );
        }
    }

    private void ensureCanTransition(
            User user,
            Transfer transfer,
            Status.TransactionStatus nextStatus
    ) {
        String roleName = user.getRole().getRoleName().name();

        if (roleName.equals("ADMIN")
                || roleName.equals("MANAGER")) {
            return;
        }

        Long userWarehouseId = user.getWarehouse() == null
                ? null
                : user.getWarehouse().getId();

        Long sourceId = transfer.getWarehouse().getId();

        Long destinationId =
                transfer.getWarehouseDestination() == null
                        ? null
                        : transfer.getWarehouseDestination().getId();

        boolean allowed =
                !isCrossWarehouse(transfer.getTransferType())
                        ? sourceId.equals(userWarehouseId)
                        : nextStatus
                                == Status.TransactionStatus.COMPLETED
                                ? destinationId != null
                                        && destinationId.equals(
                                                userWarehouseId
                                        )
                                : sourceId.equals(userWarehouseId);

        if (!allowed) {
            throw new RuntimeException(
                    "Your warehouse cannot perform this transfer action"
            );
        }
    }

    private void ensureActiveWarehouse(
            Warehouse warehouse,
            String label
    ) {
        if (warehouse.getStatus() != null
                && warehouse.getStatus() != Status.WarehouseStatus.ACTIVE) {
            throw new RuntimeException(
                    label + " warehouse is inactive"
            );
        }
    }

    private User resolveAssignee(
            Long assigneeId,
            Warehouse source,
            Warehouse destination
    ) {
        if (assigneeId == null) {
            return null;
        }

        User assignee = userRepository.findById(assigneeId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Assigned manager not found"
                        )
                );

        if (assignee.getRole() == null
                || !"WAREHOUSE_MANAGER".equals(
                        assignee.getRole().getRoleName().name()
                )) {
            throw new RuntimeException(
                    "Assignee must be a Warehouse Manager"
            );
        }

        if (Boolean.TRUE.equals(assignee.getIsDeleted())
                || assignee.getWarehouse() == null) {
            throw new RuntimeException(
                    "Assigned manager is inactive or has no warehouse"
            );
        }

        Long assigneeWarehouseId =
                assignee.getWarehouse().getId();

        Warehouse receivingWarehouse = destination != null ? destination : source;
        if (!receivingWarehouse.getId().equals(assigneeWarehouseId)) {
            throw new RuntimeException(
                    "Assigned manager must belong to the receiving warehouse"
            );
        }

        return assignee;
    }

    private String buildRemark(TransferRequest request) {
        List<String> parts = new ArrayList<>();

        if (request.getRemark() != null
                && !request.getRemark().isBlank()) {
            parts.add(request.getRemark());
        }

        if (request.getSourceLocation() != null
                && !request.getSourceLocation().isBlank()) {
            parts.add("From: " + request.getSourceLocation());
        }

        if (request.getDestinationLocation() != null
                && !request.getDestinationLocation().isBlank()) {
            parts.add("To: " + request.getDestinationLocation());
        }

        return String.join(" | ", parts);
    }

    private void deductSourceInventory(Transfer transfer) {
        for (TransferDetail detail : transfer.getDetails()) {
            List<Inventory> sources = inventoryRepository.findAllByProductIdAndWarehouseId(
                    detail.getProduct().getId(),
                    transfer.getWarehouse().getId()
            );

            if (sources.isEmpty()) {
                throw new RuntimeException("Source inventory not found for " + detail.getProduct().getCode());
            }

            long totalAvailable = sources.stream().mapToLong(i -> i.getQuantity() != null ? i.getQuantity() : 0L).sum();
            if (totalAvailable < detail.getQuantity()) {
                throw new RuntimeException("Not enough stock for " + detail.getProduct().getCode()
                        + " (Required: " + detail.getQuantity() + ", Available: " + totalAvailable + ")");
            }

            long remaining = detail.getQuantity();
            for (Inventory source : sources) {
                if (remaining <= 0) break;
                long available = source.getQuantity() != null ? source.getQuantity() : 0L;
                long deduct = Math.min(available, remaining);
                source.setQuantity(available - deduct);
                remaining -= deduct;
                inventoryRepository.save(source);
            }
        }
    }

    private void addDestinationInventory(Transfer transfer) {
        Warehouse destination = transfer.getWarehouseDestination();
        if (destination == null) {
            throw new RuntimeException("Destination warehouse is required to complete cross-warehouse transfer");
        }

        for (TransferDetail detail : transfer.getDetails()) {
            List<Inventory> dests = inventoryRepository.findAllByProductIdAndWarehouseId(
                    detail.getProduct().getId(),
                    destination.getId()
            );

            Inventory dest;
            if (dests.isEmpty()) {
                dest = Inventory.builder()
                        .warehouse(destination)
                        .product(detail.getProduct())
                        .quantity(detail.getQuantity())
                        .lowStockThreshold(10L)
                        .outOfStockWarningDays(3L)
                        .build();
            } else {
                dest = dests.get(0);
                dest.setQuantity(dest.getQuantity() + detail.getQuantity());
            }
            inventoryRepository.save(dest);
        }
    }

    private void restoreSourceInventory(Transfer transfer) {
        for (TransferDetail detail : transfer.getDetails()) {
            List<Inventory> sources = inventoryRepository.findAllByProductIdAndWarehouseId(
                    detail.getProduct().getId(),
                    transfer.getWarehouse().getId()
            );

            Inventory source;
            if (sources.isEmpty()) {
                source = Inventory.builder()
                        .warehouse(transfer.getWarehouse())
                        .product(detail.getProduct())
                        .quantity(detail.getQuantity())
                        .lowStockThreshold(10L)
                        .outOfStockWarningDays(3L)
                        .build();
            } else {
                source = sources.get(0);
                long currentQuantity = source.getQuantity() == null ? 0L : source.getQuantity();
                source.setQuantity(currentQuantity + detail.getQuantity());
            }
            inventoryRepository.save(source);
        }
    }

    private void applyInternalMovementLocation(
            Transfer transfer
    ) {
        Location destination = transfer.getDestinationLocation();
        if (destination == null) {
            throw new RuntimeException(
                    "Destination location is required to complete internal movement"
            );
        }
        validateLocationForWarehouse(destination, transfer.getWarehouse(), "Destination");

        for (TransferDetail detail : transfer.getDetails()) {
            Inventory inventory =
                    inventoryRepository
                            .findByWarehouseIdAndProductId(
                                    transfer.getWarehouse().getId(),
                                    detail.getProduct().getId()
                            )
                            .orElseThrow(() ->
                                    new RuntimeException(
                                            "Inventory not found for "
                                                    + detail.getProduct()
                                                            .getCode()
                                    )
                            );

            inventory.setLocation(destination);
            inventoryRepository.save(inventory);
        }
    }

    private String extractRemarkPart(
            String remark,
            String prefix
    ) {
        if (remark == null) {
            return null;
        }

        for (String part : remark.split(" \\| ")) {
            if (part.startsWith(prefix)) {
                return part.substring(prefix.length()).trim();
            }
        }

        return null;
    }
}
