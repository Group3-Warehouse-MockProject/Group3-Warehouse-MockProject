package com.fpt.sccw.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "activity_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "action_type", length = 50)
    private String actionType;

    @Column(name = "page_url", length = 500)
    private String pageUrl;

    @Column(name = "ip_address", length = 100)
    private String ipAddress;

    @Column(name = "location", length = 255)
    private String location;

    @Column(name = "details", columnDefinition = "TEXT")
    private String details;

    @Column(name = "timestamp")
    private LocalDateTime timestamp;
}
