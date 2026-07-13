package com.fpt.sccw.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;

/**
 * Entity ánh xạ bảng ai_vector_store trong MySQL.
 *
 * Bảng này lưu trữ embedding vector cho hệ thống RAG (Retrieval-Augmented Generation).
 * Spring AI MariaDB Vector Store sẽ ghi/đọc dữ liệu vào bảng này.
 *
 * Lưu ý cột embedding:
 *   - Kiểu Java: byte[]  (dữ liệu nhị phân)
 *   - Kiểu MySQL: BLOB   (Binary Large Object)
 *   - Spring AI serialize float[] thành byte[] trước khi lưu xuống DB
 *   - Không được dùng String vì MySQL sẽ báo lỗi "Incorrect string value"
 */
@Entity
@Table(name = "ai_vector_store")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiVectorStore {

    @Id
    @Column(name = "id", length = 36, nullable = false, updatable = false)
    private String id;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata", columnDefinition = "JSON")
    private Map<String, Object> metadata;

    /**
     * Vector embedding dưới dạng nhị phân.
     * Spring AI lưu float[] đã serialize (Java ObjectOutputStream) vào đây.
     * Phải là byte[] + columnDefinition = "BLOB" để tránh lỗi encoding UTF-8.
     */
    @Lob
    @Column(name = "embedding", columnDefinition = "BLOB")
    private byte[] embedding;
}