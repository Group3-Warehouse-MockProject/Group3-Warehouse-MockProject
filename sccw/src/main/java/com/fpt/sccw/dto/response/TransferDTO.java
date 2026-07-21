package com.fpt.sccw.dto.response;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

import com.fpt.sccw.entity.Status;
import com.fpt.sccw.entity.Transfer;
import com.fpt.sccw.entity.TransferDetail;
import com.fpt.sccw.entity.User;

import jakarta.persistence.EntityNotFoundException;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransferDTO {
    private Long id;
    private String code;
    private String type;
    private String status;
    private String remark;
    private String date;
    private Long sourceWarehouseId;
    private String sourceWarehouseCode;
    private String sourceWarehouseName;
    private Long destinationWarehouseId;
    private String destinationWarehouseCode;
    private String destinationWarehouseName;
    private String createdBy;
    private String assignedBy;
    private Long totalQuantity;
    private List<TransferLineDTO> lines;

    public static TransferDTO fromEntity(Transfer transfer) {
        List<TransferLineDTO> lineDTOs = transfer.getDetails() == null ? List.of() :
                transfer.getDetails().stream().map(TransferLineDTO::fromEntity).collect(Collectors.toList());
        long total = lineDTOs.stream().mapToLong(TransferLineDTO::getQuantity).sum();

        return TransferDTO.builder()
                .id(transfer.getId())
                .code(String.format("TR-%05d", transfer.getId()))
                .type(toDisplayType(transfer.getTransferType()))
                .status(toDisplayStatus(transfer.getStatus()))
                .remark(transfer.getRemark())
                .date(transfer.getCreatedAt() != null
                        ? transfer.getCreatedAt().format(DateTimeFormatter.ISO_LOCAL_DATE)
                        : "")
                .sourceWarehouseId(transfer.getWarehouse() != null ? transfer.getWarehouse().getId() : null)
                .sourceWarehouseCode(transfer.getWarehouse() != null ? transfer.getWarehouse().getCode() : "")
                .sourceWarehouseName(transfer.getWarehouse() != null ? transfer.getWarehouse().getWarehouseName() : "")
                .destinationWarehouseId(transfer.getWarehouseDestination() != null ? transfer.getWarehouseDestination().getId() : null)
                .destinationWarehouseCode(transfer.getWarehouseDestination() != null ? transfer.getWarehouseDestination().getCode() : "")
                .destinationWarehouseName(transfer.getWarehouseDestination() != null ? transfer.getWarehouseDestination().getWarehouseName() : "")
                .createdBy(safeUserName(transfer.getCreatedByUser(), transfer.getLegacyUser()))
                .assignedBy(safeUserName(transfer.getAssignedByUser()))
                .totalQuantity(total)
                .lines(lineDTOs)
                .build();
    }

    private static String toDisplayType(Status.TransferType type) {
        if (type == Status.TransferType.Cross_Warehouse || type == Status.TransferType.OUTBOUND) return "Cross-Warehouse";
        return "Internal Movement";
    }

    private static String toDisplayStatus(Status.TransactionStatus status) {
        return switch (status) {
            case PENDING -> "Pending";
            case DELIVERING, DELIVERED -> "InTransit";
            case COMPLETED -> "Completed";
            case CANCEL -> "Cancelled";
        };
    }

    private static String safeUserName(User user) {
        if (user == null) return "";
        try {
            return user.getFullName();
        } catch (EntityNotFoundException ex) {
            return "Unknown";
        }
    }

    private static String safeUserName(User primary, User fallback) {
        String name = safeUserName(primary);
        if (!name.isBlank() && !"Unknown".equals(name)) return name;
        String fallbackName = safeUserName(fallback);
        return fallbackName.isBlank() ? name : fallbackName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TransferLineDTO {
        private String sku;
        private String productName;
        private Long quantity;

        public static TransferLineDTO fromEntity(TransferDetail detail) {
            return TransferLineDTO.builder()
                    .sku(detail.getProduct() != null ? detail.getProduct().getCode() : "")
                    .productName(detail.getProduct() != null ? detail.getProduct().getName() : "")
                    .quantity(detail.getQuantity())
                    .build();
        }
    }
}
