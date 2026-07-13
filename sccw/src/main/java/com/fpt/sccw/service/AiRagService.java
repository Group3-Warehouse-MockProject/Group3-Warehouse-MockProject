package com.fpt.sccw.service;

public interface AiRagService {

    /** Trả lời câu hỏi về kho hàng dựa trên dữ liệu trong Vector Store */
    String askWarehouse(String question);

    /** Nạp một sản phẩm vào Vector Store */
    void ingestProduct(String productId, String description);

    /** Nạp toàn bộ sản phẩm + tồn kho từ DB vào Vector Store (dùng để khởi tạo ban đầu) */
    void ingestAllProducts();
}
