package com.fpt.sccw.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;

import com.fpt.sccw.service.AiRagService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/ai")
@ConditionalOnProperty(name = "app.ai.enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class AiController {

    private final AiRagService aiRagService;

    /**
     * Trả lời câu hỏi về kho hàng (RAG: tìm context từ Vector Store → Gemini trả lời)
     * POST /api/ai/ask
     * Body: { "question": "Kho Hà Nội còn bao nhiêu RAM?" }
     */
    @PostMapping("/ask")
    public ResponseEntity<String> askWarehouse(@RequestBody Map<String, String> request) {
        String question = request.get("question");
        if (question == null || question.isBlank()) {
            return ResponseEntity.badRequest().body("Thiếu trường 'question'.");
        }
        String answer = aiRagService.askWarehouse(question);
        return ResponseEntity.ok(answer);
    }

    /**
     * Nạp thủ công một sản phẩm vào Vector Store
     * POST /api/ai/ingest
     * Body: { "productId": "123", "description": "RAM DDR4 8GB, kho HN còn 50 cái" }
     */
    @PostMapping("/ingest")
    public ResponseEntity<String> ingestOne(@RequestBody Map<String, String> request) {
        String productId   = request.get("productId");
        String description = request.get("description");
        if (productId == null || description == null) {
            return ResponseEntity.badRequest().body("Thiếu 'productId' hoặc 'description'.");
        }
        aiRagService.ingestProduct(productId, description);
        return ResponseEntity.ok("Đã nạp sản phẩm " + productId + " vào Vector Store thành công.");
    }

    /**
     * Nạp toàn bộ dữ liệu sản phẩm + tồn kho từ DB vào Vector Store
     * POST /api/ai/ingest-all
     * Dùng khi khởi tạo lần đầu hoặc muốn đồng bộ lại toàn bộ dữ liệu
     */
    @PostMapping("/ingest-all")
    public ResponseEntity<String> ingestAll() {
        log.info("Manual ingest-all triggered via API");
        aiRagService.ingestAllProducts();
        return ResponseEntity.ok("Đã nạp toàn bộ dữ liệu kho vào Vector Store thành công.");
    }
}
