package com.fpt.sccw.service.impl;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.Document;
import org.springframework.ai.document.MetadataMode;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fpt.sccw.entity.Inventory;
import com.fpt.sccw.repository.InventoryRepository;
import com.fpt.sccw.service.AiRagService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiRagServiceImpl implements AiRagService {

    private final VectorStore vectorStore;
    private final ChatClient chatClient;
    private final InventoryRepository inventoryRepository;

    /**
     * Nạp một sản phẩm (kèm mô tả) vào Vector Store.
     * Mỗi document được đánh dấu bằng productId để có thể update/delete sau.
     */
    @Override
    @Transactional
    public void ingestProduct(String productId, String description) {
        log.info("Ingesting product {} into vector store", productId);
        Document document = new Document(description, Map.of("productId", productId));
        vectorStore.add(List.of(document));
    }

    /**
     * Nạp toàn bộ dữ liệu sản phẩm + tồn kho từ DB vào Vector Store.
     * Dùng khi khởi tạo lần đầu hoặc đồng bộ lại dữ liệu.
     */
    @Override
    @Transactional
    public void ingestAllProducts() {
        log.info("Starting full ingest of all products into vector store...");

        List<Inventory> inventories = inventoryRepository.findAll();

        if (inventories.isEmpty()) {
            log.warn("No inventory data found to ingest.");
            return;
        }

        List<Document> documents = inventories.stream()
                .map(inv -> {
                    String productId = String.valueOf(inv.getProduct().getId());
                    String description = buildDescription(inv);
                    return new Document(description, Map.of(
                            "productId",   productId,
                            "warehouseId", String.valueOf(inv.getWarehouse().getId()),
                            "inventoryId", String.valueOf(inv.getId())
                    ));
                })
                .collect(Collectors.toList());

        vectorStore.add(documents);

        log.info("Successfully ingested {} inventory records into vector store.", documents.size());
    }

    /**
     * Trả lời câu hỏi về kho hàng dựa trên context tìm được từ Vector Store.
     */
    @Override
    public String askWarehouse(String question) {
        log.info("AI question: {}", question);

        List<Document> similarDocs = vectorStore.similaritySearch(
                SearchRequest.builder().query(question).topK(5).build()
        );

        if (similarDocs.isEmpty()) {
            return "Tôi không tìm thấy thông tin liên quan đến câu hỏi của bạn trong hệ thống. " +
                   "Vui lòng đảm bảo dữ liệu kho đã được nạp vào hệ thống AI.";
        }

        String context = similarDocs.stream()
                .filter(Objects::nonNull)
                .map(doc -> doc.getFormattedContent(MetadataMode.ALL))
                .collect(Collectors.joining("\n---\n"));

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
    // Helper
    // -----------------------------------------------------------------------

    /** Tạo chuỗi mô tả cho một bản ghi inventory để lưu vào Vector Store */
    private String buildDescription(Inventory inv) {
        return String.format(
                "Sản phẩm: %s (mã: %s) | Danh mục: %s | Nhà cung cấp: %s | " +
                "Giá: %s VNĐ | Thông số: %s | " +
                "Kho: %s (%s) | Tồn kho: %d cái | Trạng thái: %s",
                inv.getProduct().getName(),
                inv.getProduct().getCode(),
                inv.getProduct().getCategory() != null ? inv.getProduct().getCategory().getName() : "N/A",
                inv.getProduct().getSupplier() != null ? inv.getProduct().getSupplier().getName() : "N/A",
                inv.getProduct().getPrice(),
                inv.getProduct().getSpecification(),
                inv.getWarehouse().getWarehouseName(),
                inv.getWarehouse().getLocation(),
                inv.getQuantity(),
                inv.getProduct().getStatus()
        );
    }
}
