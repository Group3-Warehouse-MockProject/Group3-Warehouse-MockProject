package com.fpt.sccw.service.impl;

import java.io.ByteArrayInputStream;
import java.io.ObjectInputStream;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fpt.sccw.dto.response.AiResponseDto;


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
    private final ObjectMapper objectMapper = new ObjectMapper();

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

            // Xóa vector cũ nếu có để tránh trùng lặp
            jdbcTemplate.update("DELETE FROM ai_vector_store WHERE id = ?", String.valueOf(inventoryId));

            Document document  = new Document(
                    String.valueOf(inv.getId()), // Đặt document ID bằng inventory ID
                    description, 
                    Map.of(
                            "productId",   productId,
                            "warehouseId", String.valueOf(inv.getWarehouse().getId()),
                            "inventoryId", String.valueOf(inv.getId())
                    )
            );
            vectorStore.add(List.of(document));
            log.info("Re-ingested inventory id={}, product={} successfully.", inventoryId, productId);
        }, () -> {
            // Nếu không tìm thấy inventory (đã bị xóa), xóa luôn vector tương ứng
            jdbcTemplate.update("DELETE FROM ai_vector_store WHERE id = ?", String.valueOf(inventoryId));
            log.info("Inventory id={} not found/deleted, removed its vector from store.", inventoryId);
        });
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
                .map(inv -> new Document(
                        String.valueOf(inv.getId()), // Đặt document ID bằng inventory ID
                        buildDescription(inv), 
                        Map.of(
                                "productId",   String.valueOf(inv.getProduct().getId()),
                                "warehouseId", String.valueOf(inv.getWarehouse().getId()),
                                "inventoryId", String.valueOf(inv.getId())
                        )
                ))
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
    public AiResponseDto askWarehouse(String question) {
        log.info("AI question: {}", question);

        // 1. Embed câu hỏi thành vector
        float[] queryVector = embeddingModel.embed(question);

        // 2. Lấy toàn bộ records từ DB
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT content, embedding FROM ai_vector_store"
        );

        if (rows.isEmpty()) {
            return AiResponseDto.builder()
                    .answer("The warehouse data has not been synced to the AI system yet. Please contact your administrator to perform the data sync.")
                    .suggestions(List.of())
                    .build();
        }

        // 3. Tính cosine similarity — lấy tất cả bản ghi có score >= 0.5,
        //    tối đa 20 bản ghi để đảm bảo không bỏ sót khi hỏi về nhiều kho.
        record ScoredContent(String content, double score) {}

        final double MIN_SCORE = 0.3;  // Ngưỡng tối thiểu — đủ thấp để hỗ trợ cả câu hỏi tiếng Anh
        final int    MAX_RESULTS = 20; // Đủ để chứa tất cả inventory records thực tế

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
                .filter(sc -> sc.score() >= MIN_SCORE)
                .sorted(Comparator.comparingDouble((ScoredContent sc) -> sc.score()).reversed())
                .limit(MAX_RESULTS)
                .map(sc -> sc.content())
                .collect(Collectors.toList());

        if (topContents.isEmpty()) {
            return AiResponseDto.builder()
                    .answer("I couldn't find any information matching your question in the current warehouse data. Could you try asking in a different way?")
                    .suggestions(List.of())
                    .build();
        }

        String context = String.join("\n---\n", topContents);
        log.info("Found {} relevant context snippets for question.", topContents.size());

        // 4. Gọi Gemini với context và yêu cầu JSON
        String rawResponse = chatClient.prompt()  
                .system("""
                        You are the AI assistant for the TechStock warehouse management system.
                        Please answer the user's question BASED ON the warehouse information below.
                        Answer in English, concisely and accurately.
                        If the information is not sufficient, please state it clearly.
                        
                        IMPORTANT: You MUST return the response strictly in JSON format matching this structure exactly:
                        {
                            "answer": "Your detailed answer here",
                            "suggestions": ["Follow-up question 1?", "Follow-up question 2?", "Follow-up question 3?"]
                        }
                        Do NOT wrap the JSON in Markdown backticks like ```json ... ```. 
                        Generate exactly 3 relevant follow-up questions in the suggestions array based on the user's question and your answer.

                        Warehouse information:
                        """ + context)
                .user(question)
                .call()
                .content();
                
        // 5. Parse JSON
        try {
            // Loại bỏ markdown backticks nếu AI cố tình trả về
            if (rawResponse.startsWith("```json")) {
                rawResponse = rawResponse.substring(7);
            }
            if (rawResponse.startsWith("```")) {
                rawResponse = rawResponse.substring(3);
            }
            if (rawResponse.endsWith("```")) {
                rawResponse = rawResponse.substring(0, rawResponse.length() - 3);
            }
            return objectMapper.readValue(rawResponse.trim(), AiResponseDto.class);
        } catch (JsonProcessingException e) {
            log.error("Failed to parse AI response as JSON: {}", rawResponse, e);
            return AiResponseDto.builder()
                    .answer(rawResponse) // Trả về raw text nếu lỗi parse
                    .suggestions(List.of("📦 How many products are currently in stock?", "🏭 Show me the inventory for each warehouse"))
                    .build();
        }
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
