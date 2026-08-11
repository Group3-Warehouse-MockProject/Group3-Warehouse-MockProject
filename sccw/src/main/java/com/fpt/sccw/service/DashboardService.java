package com.fpt.sccw.service;

import com.fpt.sccw.dto.response.DashboardDTO;
import com.fpt.sccw.dto.response.MovementDTO;
import com.fpt.sccw.dto.response.WeeklyFlowDTO;
import com.fpt.sccw.entity.*;
import com.fpt.sccw.repository.TransferRepository;
import com.fpt.sccw.repository.WarehouseReceiptRepository;
import com.fpt.sccw.dto.response.CategoryShareDTO;
import com.fpt.sccw.entity.Inventory;
import com.fpt.sccw.repository.InventoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {
    private final WarehouseReceiptRepository receiptRepository;
    private final TransferRepository transferRepository;
    private final InventoryRepository inventoryRepository;

    @Transactional(readOnly = true)
    public DashboardDTO getDashboardData(Long warehouseId) {
        List<WarehouseReceipt> receipts;
        List<Transfer> transfers;

        if (warehouseId != null) {
            receipts = receiptRepository.findByWarehouseId(warehouseId);
            transfers = transferRepository.findByWarehouseIdOrWarehouseDestinationId(warehouseId, warehouseId);
        } else {
            receipts = receiptRepository.findAll();
            transfers = transferRepository.findAll();
        }

        // Count pending orders
        long pendingOrders = 0;
        for (WarehouseReceipt r : receipts) {
            if (r.getStatus().name().equals("PENDING")) pendingOrders++;
        }
        for (Transfer t : transfers) {
            if (t.getStatus().name().equals("PENDING")) pendingOrders++;
        }

        // Extract movements
        List<MovementDTO> movements = new ArrayList<>();
        
        for (WarehouseReceipt r : receipts) {
            for (ReceiptDetail d : r.getDetails()) {
                boolean isInbound = r.getType().name().equals("INBOUND");
                String partner = r.getType().name().equals("INBOUND") ? "Supplier" : "Customer";
                if (isInbound && r.getSupplier() != null) {
                    partner = r.getSupplier().getName();
                } else if (isInbound && d.getProduct().getSupplier() != null) {
                    partner = d.getProduct().getSupplier().getName();
                }

                movements.add(MovementDTO.builder()
                        .id("R-" + r.getId() + "-" + d.getId())
                        .receiptId(r.getId())
                        .type(isInbound ? "Inbound" : "Outbound")
                        .sku(d.getProduct().getCode())
                        .product(d.getProduct().getName())
                        .partner(partner)
                        .staff(r.getUser().getFullName())
                        .warehouseId(String.valueOf(r.getWarehouse().getId()))
                        .qty(d.getQuantity())
                        .date(r.getCreatedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")))
                        .status(r.getStatus().name())
                        .remark(r.getRemark())
                        .createdAt(r.getCreatedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")))
                        .updatedAt(r.getUpdatedAt() != null ? r.getUpdatedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm")) : null)
                        .build());
            }
        }

        for (Transfer t : transfers) {
            for (TransferDetail d : t.getDetails()) {
                boolean isOutboundFromPerspective = warehouseId == null || t.getWarehouse().getId().equals(warehouseId);
                String type = isOutboundFromPerspective ? "Outbound" : "Inbound";
                String partner = t.getWarehouseDestination() != null ? t.getWarehouseDestination().getLocation() : "External";

                movements.add(MovementDTO.builder()
                        .id("T-" + t.getId() + "-" + d.getId())
                        .type(type)
                        .sku(d.getProduct().getCode())
                        .product(d.getProduct().getName())
                        .partner("Transfer to " + partner)
                        .staff(t.getCreatedByUser().getFullName())
                        .warehouseId(String.valueOf(isOutboundFromPerspective ? t.getWarehouse().getId() : (t.getWarehouseDestination() != null ? t.getWarehouseDestination().getId() : "")))
                        .qty(d.getQuantity())
                        .date(t.getCreatedAt().format(DateTimeFormatter.ofPattern("MMM dd, yyyy")))
                        .build());
            }
        }

        // Sort movements by createdAt roughly (we don't have createdAt in DTO directly, but we can sort by date string)
        movements.sort((a, b) -> b.getId().compareTo(a.getId()));
        List<MovementDTO> recentMovements = movements.stream().limit(10).collect(Collectors.toList());

        // Weekly Flow: Aggregate real data for the last 7 days ending at the latest transaction date
        LocalDate maxDate = LocalDate.now();
        if (!receipts.isEmpty() || !transfers.isEmpty()) {
            LocalDate maxReceiptDate = receipts.stream()
                    .map(r -> r.getCreatedAt().toLocalDate())
                    .max(LocalDate::compareTo)
                    .orElse(LocalDate.MIN);
            LocalDate maxTransferDate = transfers.stream()
                    .map(t -> t.getCreatedAt().toLocalDate())
                    .max(LocalDate::compareTo)
                    .orElse(LocalDate.MIN);
            LocalDate latestDbDate = maxReceiptDate.isAfter(maxTransferDate) ? maxReceiptDate : maxTransferDate;
            if (latestDbDate.isAfter(LocalDate.MIN)) {
                maxDate = latestDbDate;
            }
        }

        Map<String, Long> inMap = new java.util.HashMap<>();
        Map<String, Long> outMap = new java.util.HashMap<>();
        for (int i = 6; i >= 0; i--) {
            String dayStr = maxDate.minusDays(i).format(DateTimeFormatter.ofPattern("EEE"));
            inMap.put(dayStr, 0L);
            outMap.put(dayStr, 0L);
        }

        for (WarehouseReceipt r : receipts) {
            LocalDate rDate = r.getCreatedAt().toLocalDate();
            if (!rDate.isBefore(maxDate.minusDays(6))) {
                String dayStr = rDate.format(DateTimeFormatter.ofPattern("EEE"));
                long qty = r.getDetails().stream().mapToLong(ReceiptDetail::getQuantity).sum();
                if (r.getType().name().equals("INBOUND")) {
                    inMap.put(dayStr, inMap.getOrDefault(dayStr, 0L) + qty);
                } else {
                    outMap.put(dayStr, outMap.getOrDefault(dayStr, 0L) + qty);
                }
            }
        }

        for (Transfer t : transfers) {
            LocalDate tDate = t.getCreatedAt().toLocalDate();
            if (!tDate.isBefore(maxDate.minusDays(6))) {
                String dayStr = tDate.format(DateTimeFormatter.ofPattern("EEE"));
                long qty = t.getDetails().stream().mapToLong(TransferDetail::getQuantity).sum();
                boolean isOutboundFromPerspective = warehouseId == null || t.getWarehouse().getId().equals(warehouseId);
                if (isOutboundFromPerspective) {
                    outMap.put(dayStr, outMap.getOrDefault(dayStr, 0L) + qty);
                } else {
                    inMap.put(dayStr, inMap.getOrDefault(dayStr, 0L) + qty);
                }
            }
        }

        List<WeeklyFlowDTO> weeklyFlow = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            String dayStr = maxDate.minusDays(i).format(DateTimeFormatter.ofPattern("EEE"));
            weeklyFlow.add(new WeeklyFlowDTO(dayStr, inMap.get(dayStr), outMap.get(dayStr)));
        }

        // ── Inventory aggregates ──────────────────────────────────────────
        List<Inventory> allInventory;
        if (warehouseId != null) {
            allInventory = inventoryRepository.findByWarehouseIdEager(warehouseId);
        } else {
            allInventory = inventoryRepository.findAllEager();
        }

        long totalSKUs = allInventory.stream()
                .map(inv -> inv.getProduct().getId())
                .distinct()
                .count();

        long totalUnits = allInventory.stream()
                .mapToLong(inv -> inv.getQuantity() != null ? inv.getQuantity() : 0L)
                .sum();

        java.math.BigDecimal inventoryValue = allInventory.stream()
                .map(inv -> {
                    long qty = inv.getQuantity() != null ? inv.getQuantity() : 0L;
                    java.math.BigDecimal cost = inv.getProduct().getCost() != null ? inv.getProduct().getCost() : java.math.BigDecimal.ZERO;
                    return cost.multiply(java.math.BigDecimal.valueOf(qty));
                })
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        long lowStockCount = allInventory.stream()
                .filter(inv -> inv.getLowStockThreshold() != null && inv.getLowStockThreshold() > 0
                        && inv.getQuantity() != null && inv.getQuantity() <= inv.getLowStockThreshold())
                .count();

        // Category share
        Map<String, Long> catMap = new java.util.HashMap<>();
        for (Inventory inv : allInventory) {
            String catName = inv.getProduct().getCategory() != null ? inv.getProduct().getCategory().getName() : "Uncategorized";
            long qty = inv.getQuantity() != null ? inv.getQuantity() : 0L;
            catMap.merge(catName, qty, Long::sum);
        }
        List<CategoryShareDTO> categoryShare = catMap.entrySet().stream()
                .map(e -> new CategoryShareDTO(e.getKey(), e.getValue()))
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .collect(Collectors.toList());

        return DashboardDTO.builder()
                .movements(recentMovements)
                .weeklyFlow(weeklyFlow)
                .pendingOrders(pendingOrders)
                .totalSKUs(totalSKUs)
                .totalUnits(totalUnits)
                .inventoryValue(inventoryValue)
                .lowStockCount(lowStockCount)
                .categoryShare(categoryShare)
                .build();
    }
}
