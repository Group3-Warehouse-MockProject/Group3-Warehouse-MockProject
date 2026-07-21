package com.fpt.sccw.dto.response;

import com.fpt.sccw.entity.InventoryCheck;
import com.fpt.sccw.entity.InventoryCheckDetail;
import com.fpt.sccw.entity.Status;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryCheckDTO {

    private Long id;
    private String status;
    private String remark;

    // Thông tin kho
    private Long warehouseId;
    private String warehouseName;
    private String warehouseCode;

    // Người tạo phiếu
    private Long createdByUserId;
    private String createdByName;

    // Người được gán đếm
    private Long assignedUserId;
    private String assignedByName;
    private String assignedUserName;

    // Chi tiết sản phẩm
    private List<DetailDTO> details;

    // Thống kê tổng hợp
    private Integer totalItems;
    private Long totalVariance;
    private Integer items;
    private Long variance;
    private String date;

    // -------------------------------------------------------
    // Nested DTO cho từng dòng sản phẩm trong phiếu
    // -------------------------------------------------------
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DetailDTO {
        private Long id;
        private String sku;
        private String productName;
        private Long systemQuantity;
        private Long actualQuantity;
        private Long difference;
        private String remark;
    }

    // -------------------------------------------------------
    // Convert từ Entity sang DTO
    // -------------------------------------------------------
    public static InventoryCheckDTO fromEntity(InventoryCheck check) {
        boolean isPending = check.getStatus() != null && "PENDING".equalsIgnoreCase(check.getStatus().name());
        boolean isCancelled = check.getStatus() != null && "CANCELLED".equalsIgnoreCase(check.getStatus().name());

        List<DetailDTO> detailDTOs = check.getDetails() != null
                ? check.getDetails().stream()
                .filter(d -> d != null)
                .map(d -> DetailDTO.builder()
                        .id(d.getId())
                        .sku(d.getProduct() != null ? d.getProduct().getCode() : "")
                        .productName(d.getProduct() != null ? d.getProduct().getName() : "")
                        .systemQuantity(d.getSystemQuantity() != null ? d.getSystemQuantity() : 0L)
                        .actualQuantity(isPending ? null : d.getActualQuantity())
                        .difference(isPending ? null : (d.getDifference() != null ? d.getDifference() : 0L))
                        .remark(d.getRemark())
                        .build())
                .collect(Collectors.toList())
                : List.of();

        long totalVariance = (isPending || isCancelled || check.getDetails() == null)
                ? 0L
                : check.getDetails().stream()
                .filter(d -> d != null && d.getActualQuantity() != null)
                .mapToLong(d -> d.getDifference() != null ? d.getDifference() : 0L)
                .sum();

        String dateStr = check.getCreatedAt() != null
                ? check.getCreatedAt().toLocalDate().toString()
                : "";

        return InventoryCheckDTO.builder()
                .id(check.getId())
                .status(check.getStatus() != null ? check.getStatus().name() : "PENDING")
                .remark(check.getRemark())
                .warehouseId(check.getWarehouse() != null ? check.getWarehouse().getId() : null)
                .warehouseName(check.getWarehouse() != null ? check.getWarehouse().getWarehouseName() : "")
                .warehouseCode(check.getWarehouse() != null ? check.getWarehouse().getCode() : "")
                .createdByUserId(check.getUser() != null ? check.getUser().getId() : null)
                .createdByName(check.getUser() != null ? check.getUser().getFullName() : "")
                .assignedUserId(check.getAssignedUser() != null ? check.getAssignedUser().getId() : null)
                .assignedByName(check.getAssignedUser() != null ? check.getAssignedUser().getFullName() : null)
                .assignedUserName(check.getAssignedUser() != null ? check.getAssignedUser().getFullName() : null)
                .date(dateStr)
                .totalItems(detailDTOs.size())
                .items(detailDTOs.size())
                .totalVariance(totalVariance)
                .variance(totalVariance)
                .details(detailDTOs)
                .build();
    }
}
