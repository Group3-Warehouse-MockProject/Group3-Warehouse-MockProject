package com.fpt.sccw.repository;

import com.fpt.sccw.entity.AiVectorStore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiVectorStoreRepository extends JpaRepository<AiVectorStore, String> {
}