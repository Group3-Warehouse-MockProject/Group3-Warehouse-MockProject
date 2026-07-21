package com.fpt.sccw.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "feedback")
@Getter
@Setter
@NoArgsConstructor
public class Feedback extends BaseEntity {

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 30)
    private String category;

    @Column(nullable = false, length = 2000)
    private String message;

    @Column(nullable = false)
    private Integer rating;

    @Column(length = 2000)
    private String response;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "responded_by_user_id")
    private User respondedBy;

    private LocalDateTime respondedAt;
}
