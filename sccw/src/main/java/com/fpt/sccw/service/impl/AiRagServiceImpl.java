package com.fpt.sccw.service.impl;

import java.io.ByteArrayInputStream;
import java.io.ObjectInputStream;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

import com.fpt.sccw.entity.Inventory;
import com.fpt.sccw.repository.InventoryRepository;
import com.fpt.sccw.service.AiRagService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@ConditionalOnProperty(name = "app.ai.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class AiRagServiceImpl implements AiRagService {

    private final VectorStore vectorStore;
    private final ChatClient chatClient;
    private final EmbeddingModel embeddingModel;
    private final InventoryRepository inventoryRepository;
    private final JdbcTemplate jdbcTemplate;

    // -----------------------------------------------------------------------
    // Ingest
    // -----------------------------------------------------------------------

    /**
     * Nạp một sản phẩm (kèm mô tả) vào Vector Store theo productId + description thủ công.
     */
    @Override
    @Transactional
    public void ingestProduct(String productId, String description) {
        log.info("Ingesting product {} into vector store", productId);
        Document document = new Document(description, Map.of("productId", productId));
        vectorStore.add(List.of(document));
    }

    /**
     * Nạp lại một bản ghi inventory theo ID.
     * Được gọi tự động bởi AiRagEventListener khi tồn kho thay đổi.
     */
    @Override
    @Transactional
    public void ingestInventoryById(Long inventoryId) {
        inventoryRepository.findById(inventoryId).ifPresentOrElse(inv -> {
            String productId   = String.valueOf(inv.getProduct().getId());
            String description = buildDescription(inv);
            Document document  = new Document(description, Map.of(
                    "productId",   productId,
                    "warehouseId", String.valueOf(inv.getWarehouse().getId()),
                    "inventoryId", String.valueOf(inv.getId())
            ));
            vectorStore.add(List.of(document));
            log.info("Re-ingested inventory id={}, product={} successfully.", inventoryId, productId);
        }, () -> log.warn("Inventory id={} not found, skipping re-ingest.", inventoryId));
    }

    /**
     * Nạp toàn bộ dữ liệu sản phẩm + tồn kho từ DB vào Vector Store.
     * XÓA toàn bộ dữ liệu cũ trước để tránh tích lũy bản ghi trùng lặp.
     */
    @Override
    @Transactional
    public void ingestAllProducts() {
        log.info("Starting full ingest of all products into vector store...");

        int deleted = jdbcTemplate.update("DELETE FROM ai_vector_store");
        log.info("Cleared {} old vector records before re-ingesting.", deleted);

        List<Inventory> inventories = inventoryRepository.findAll();

        if (inventories.isEmpty()) {
            log.warn("No inventory data found to ingest.");
            return;
        }

        List<Document> documents = inventories.stream()
                .map(inv -> new Document(buildDescription(inv), Map.of(
                        "productId",   String.valueOf(inv.getProduct().getId()),
                        "warehouseId", String.valueOf(inv.getWarehouse().getId()),
                        "inventoryId", String.valueOf(inv.getId())
                )))
                .collect(Collectors.toList());

        vectorStore.add(documents);
        log.info("Successfully ingested {} inventory records into vector store.", documents.size());
    }

    /**
     * Trả lời câu hỏi về kho hàng.
     *
     * Vì database là MySQL 8.0 (không có VEC_DISTANCE_EUCLIDEAN của MariaDB),
     * chúng ta tự thực hiện similarity search bằng Java:
     *   1. Embed câu hỏi → float[]
     *   2. Lấy tất cả embedding từ bảng ai_vector_store qua JdbcTemplate
     *   3. Deserialize BLOB → float[]
     *   4. Tính cosine similarity, lấy top-5
     *   5. Truyền context vào Gemini và trả về câu trả lời
     */
    @Override
    public String askWarehouse(String question) {
        log.info("AI question: {}", question);

        // 1. Embed câu hỏi thành vector
        float[] queryVector = embeddingModel.embed(question);

        // 2. Lấy toàn bộ records từ DB
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT content, embedding FROM ai_vector_store"
        );

        if (rows.isEmpty()) {
            return "Tôi không tìm thấy thông tin nào trong hệ thống. " +
                   "Vui lòng gọi /api/ai/ingest-all để nạp dữ liệu kho vào hệ thống AI trước.";
        }

        // 3. Tính cosine similarity và lấy top-5
        record ScoredContent(String content, double score) {}

        List<String> topContents = rows.stream()
                .map(row -> {
                    try {
                        byte[] blob = (byte[]) row.get("embedding");
                        float[] storedVector = deserializeFloatArray(blob);
                        double score = cosineSimilarity(queryVector, storedVector);
                        return new ScoredContent((String) row.get("content"), score);
                    } catch (Exception e) {
                        log.warn("Skipping a row due to deserialization error: {}", e.getMessage());
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .sorted(Comparator.comparingDouble((ScoredContent sc) -> sc.score()).reversed())
                .limit(5)
                .map(sc -> sc.content())
                .collect(Collectors.toList());

        if (topContents.isEmpty()) {
            return "Không thể xử lý dữ liệu vector. Vui lòng thử gọi /api/ai/ingest-all lại.";
        }

        String context = String.join("\n---\n", topContents);
        log.info("Found {} relevant context snippets for question.", topContents.size());

        // 4. Gọi Gemini với context
        return chatClient.prompt()  
                .system("""
                        Bạn là trợ lý AI của hệ thống quản lý kho hàng TechStock.
                        Hãy trả lời câu hỏi của người dùng DỰA TRÊN thông tin kho bên dưới.
                        Trả lời bằng tiếng Việt, ngắn gọn và chính xác.
                        Nếu thông tin không đủ, hãy nói rõ.

                        Thông tin kho hàng:
                        """ + context)
                .user(question)
                .call()
                .content();
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    /** Tạo chuỗi mô tả cho một bản ghi inventory để lưu vào Vector Store */
    private String buildDescription(Inventory inv) {
        String status = "Hết hàng";
        if (inv.getQuantity() != null && inv.getQuantity() > 0) {
            if (inv.getLowStockThreshold() != null && inv.getQuantity() <= inv.getLowStockThreshold()) {
                status = "Sắp hết hàng";
            } else {
                status = "Còn hàng";
            }
        }

        return String.format(
                "Sản phẩm: %s (mã: %s) | Danh mục: %s | Nhà cung cấp: %s | " +
                "Giá: %s VNĐ | Thông số: %s | " +
                "Kho: %s (%s) | Tồn kho: %d cái | Trạng thái: %s",
                inv.getProduct().getName(),
                inv.getProduct().getCode(),
                inv.getProduct().getCategory() != null ? inv.getProduct().getCategory().getName() : "N/A",
                inv.getProduct().getSupplier()  != null ? inv.getProduct().getSupplier().getName()  : "N/A",
                inv.getProduct().getPrice(),
                inv.getProduct().getSpecification(),
                inv.getWarehouse().getWarehouseName(),
                inv.getWarehouse().getLocation(),
                inv.getQuantity(),
                status
        );
    }

    /**
     * Deserialize BLOB từ bảng ai_vector_store thành float[].
     * Spring AI MariaDB vector store lưu embedding dưới dạng Java-serialized float[].
     * (nhận diện bởi magic bytes: 0xAC 0xED = Java serialization header)
     */
    private float[] deserializeFloatArray(byte[] bytes) throws Exception {
        try (ObjectInputStream ois = new ObjectInputStream(new ByteArrayInputStream(bytes))) {
            return (float[]) ois.readObject();
        }
    }

    /**
     * Tính cosine similarity giữa hai vector float[].
     * Kết quả từ -1 đến 1. Càng gần 1 càng giống nhau.
     */
    private double cosineSimilarity(float[] a, float[] b) {
        if (a == null || b == null || a.length == 0 || b.length == 0) return 0.0;
        int len = Math.min(a.length, b.length);
        double dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < len; i++) {
            dot   += (double) a[i] * b[i];
            normA += (double) a[i] * a[i];
            normB += (double) b[i] * b[i];
        }
        if (normA == 0 || normB == 0) return 0.0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
