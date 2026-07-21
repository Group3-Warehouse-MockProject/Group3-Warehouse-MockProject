package com.fpt.sccw.dto.request;

import lombok.Data;

import java.util.List;

@Data
public class InventoryCheckRequest {

    // ID kho cần kiểm kê
    private Long warehouseId;

    // ID user được assign thực hiện đếm (thường là Staff)
    private Long assignedUserId;

    // Ghi chú (scope: full / theo zone / theo category...)
    private String remark;

    // Danh sách sản phẩm cần đếm (frontend gửi lên khi tạo phiếu)
    private List<Long> productIds;

    // -------------------------------------------------------
    // Dùng khi Staff submit số đếm thực tế (POST /details)
    // -------------------------------------------------------
    @Data
    public static class DetailRequest {
        private Long productId;
        private Long actualQuantity;
        private Long systemQuantity;
        private String remark;
    }
}
