package com.fpt.sccw.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "policy_acceptances")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PolicyAcceptance extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "policy_version", nullable = false, length = 50)
    private String policyVersion;

    @Column(name = "ip_address", length = 100)
    private String ipAddress;
}
