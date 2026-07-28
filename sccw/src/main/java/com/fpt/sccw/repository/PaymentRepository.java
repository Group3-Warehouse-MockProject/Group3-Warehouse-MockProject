package com.fpt.sccw.repository;

import com.fpt.sccw.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByReceiptIdOrderByCreatedAtDesc(Long receiptId);
    void deleteByReceiptId(Long receiptId);
}
