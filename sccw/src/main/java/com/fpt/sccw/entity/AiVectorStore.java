package com.fpt.sccw.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.*;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "ai_vector_store")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiVectorStore {

    @Id
    @Column(name = "id", length = 36)
    private String id;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata")
    private Map<String, Object> metadata;

    @Column(name = "embedding", columnDefinition = "BLOB")
    private String embedding;
}