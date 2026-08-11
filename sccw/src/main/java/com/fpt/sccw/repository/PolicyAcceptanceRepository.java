package com.fpt.sccw.repository;

import com.fpt.sccw.entity.PolicyAcceptance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PolicyAcceptanceRepository extends JpaRepository<PolicyAcceptance, Long> {
    Optional<PolicyAcceptance> findFirstByUserIdOrderByCreatedAtDesc(Long userId);
}
