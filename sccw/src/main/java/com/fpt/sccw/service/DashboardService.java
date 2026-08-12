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
        long pendingOrders = receiptRepository.countPending(warehouseId) + transferRepository.countPending(warehouseId);

        java.time.LocalDateTime since30Days = java.time.LocalDateTime.now().minusDays(30);
        List<WarehouseReceipt> recentReceipts = receiptRepository.findRecentWithBasicJoins(warehouseId, since30Days, org.springframework.data.domain.PageRequest.of(0, 10)).getContent();

        List<Transfer> recentTransfers;
        org.springframework.data.domain.PageRequest pageRequest = org.springframework.data.domain.PageRequest.of(0, 10, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"));
        if (warehouseId != null) {
            recentTransfers = transferRepository.findByWarehouseEagerPaged(warehouseId, pageRequest).getContent();
        } else {
            recentTransfers = transferRepository.findAllEagerPaged(pageRequest).getContent();
        }

        List<MovementDTO> movements = new ArrayList<>();
        
        for (WarehouseReceipt r : recentReceipts) {
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

        for (Transfer t : recentTransfers) {
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

        movements.sort((a, b) -> b.getId().compareTo(a.getId()));
        List<MovementDTO> recentMovements = movements.stream().limit(10).collect(Collectors.toList());

        // Weekly Flow
        LocalDate maxDate = LocalDate.now();
        Map<String, Long> inMap = new java.util.HashMap<>();
        Map<String, Long> outMap = new java.util.HashMap<>();
        for (int i = 6; i >= 0; i--) {
            String dayStr = maxDate.minusDays(i).format(DateTimeFormatter.ofPattern("EEE"));
            inMap.put(dayStr, 0L);
            outMap.put(dayStr, 0L);
        }

        java.time.LocalDateTime since7Days = java.time.LocalDateTime.now().minusDays(7);
        List<WarehouseReceipt> weeklyReceipts = receiptRepository.findRecentWithBasicJoins(warehouseId, since7Days, org.springframework.data.domain.PageRequest.of(0, 1000)).getContent();
        for (WarehouseReceipt r : weeklyReceipts) {
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

        List<Transfer> weeklyTransfers;
        org.springframework.data.domain.PageRequest weeklyPageRequest = org.springframework.data.domain.PageRequest.of(0, 1000, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt"));
        if (warehouseId != null) {
            weeklyTransfers = transferRepository.findByWarehouseEagerPaged(warehouseId, weeklyPageRequest).getContent();
        } else {
            weeklyTransfers = transferRepository.findAllEagerPaged(weeklyPageRequest).getContent();
        }
        for (Transfer t : weeklyTransfers) {
            LocalDate tDate = t.getCreatedAt().toLocalDate();
            if (t.getCreatedAt().isAfter(since7Days) && !tDate.isBefore(maxDate.minusDays(6))) {
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

        long totalSKUs = inventoryRepository.countDistinctProducts(warehouseId);
        long totalUnits = inventoryRepository.sumQuantity(warehouseId);
        java.math.BigDecimal inventoryValue = inventoryRepository.sumInventoryValue(warehouseId);
        long lowStockCount = inventoryRepository.countLowStock(warehouseId);

        List<Object[]> categoryShareAgg = inventoryRepository.aggregateCategoryShare(warehouseId);
        List<CategoryShareDTO> categoryShare = new ArrayList<>();
        for (Object[] row : categoryShareAgg) {
            String catName = row[0] != null ? row[0].toString() : "Uncategorized";
            long qty = row[1] != null ? ((Number) row[1]).longValue() : 0L;
            categoryShare.add(new CategoryShareDTO(catName, qty));
        }

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
