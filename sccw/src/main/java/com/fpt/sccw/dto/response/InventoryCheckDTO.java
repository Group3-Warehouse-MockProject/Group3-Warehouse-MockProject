package com.fpt.sccw.dto.response;

import com.fpt.sccw.entity.InventoryCheck;
import com.fpt.sccw.entity.InventoryCheckDetail;
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

    // Nhân viên được giao đếm
    private Long assignedUserId;
    private String assignedUserName;

    // Ngày tạo (dạng chuỗi để frontend dùng trực tiếp)
    private String date;

    // Tổng số mặt hàng trong phiếu
    private int items;

    // Tổng chênh lệch
    private long variance;

    // Chi tiết từng sản phẩm
    private List<DetailDTO> details;

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
        List<DetailDTO> detailDTOs = check.getDetails().stream()
                .map(d -> DetailDTO.builder()
                        .id(d.getId())
                        .sku(d.getProduct().getCode())
                        .productName(d.getProduct().getName())
                        .systemQuantity(d.getSystemQuantity())
                        .actualQuantity(d.getActualQuantity())
                        .difference(d.getDifference())
                        .remark(d.getRemark())
                        .build())
                .collect(Collectors.toList());

        long totalVariance = check.getDetails().stream()
                .mapToLong(InventoryCheckDetail::getDifference)
                .sum();

        String dateStr = check.getCreatedAt() != null
                ? check.getCreatedAt().toLocalDate().toString()
                : "";

        return InventoryCheckDTO.builder()
                .id(check.getId())
                .status(check.getStatus().name())
                .remark(check.getRemark())
                .warehouseId(check.getWarehouse().getId())
                .warehouseName(check.getWarehouse().getWarehouseName())
                .warehouseCode(check.getWarehouse().getCode())
                .createdByUserId(check.getUser().getId())
                .createdByName(check.getUser().getFullName())
                .assignedUserId(check.getAssignedUser() != null ? check.getAssignedUser().getId() : null)
                .assignedUserName(check.getAssignedUser() != null ? check.getAssignedUser().getFullName() : null)
                .date(dateStr)
                .items(detailDTOs.size())
                .variance(totalVariance)
                .details(detailDTOs)
                .build();
    }
}
