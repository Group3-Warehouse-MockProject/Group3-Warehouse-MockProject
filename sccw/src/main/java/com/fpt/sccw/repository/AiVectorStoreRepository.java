package com.fpt.sccw.repository;

import com.fpt.sccw.entity.AiVectorStore;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repository để Hibernate quản lý bảng ai_vector_store.
 * Dùng để xóa toàn bộ dữ liệu cũ trước khi ingest-all (tránh trùng lặp).
 */
public interface AiVectorStoreRepository extends JpaRepository<AiVectorStore, String> {
}