package com.fpt.sccw.service;

public interface AiRagService {

    /** Trả lời câu hỏi về kho hàng dựa trên dữ liệu trong Vector Store */
    String askWarehouse(String question);

    /** Nạp một sản phẩm vào Vector Store bằng productId + description thủ công */
    void ingestProduct(String productId, String description);

    /** Nạp lại một bản ghi inventory theo ID (dùng cho auto re-ingest khi tồn kho thay đổi) */
    void ingestInventoryById(Long inventoryId);

    /** Nạp toàn bộ sản phẩm + tồn kho từ DB vào Vector Store (xóa dữ liệu cũ trước) */
    void ingestAllProducts();
}
