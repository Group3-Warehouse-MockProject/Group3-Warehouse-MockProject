package com.fpt.sccw.controller;

import com.fpt.sccw.dto.response.PaymentDTO;
import com.fpt.sccw.entity.*;
import com.fpt.sccw.repository.PaymentRepository;
import com.fpt.sccw.repository.UserRepository;
import com.fpt.sccw.repository.WarehouseReceiptRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/receipts/{receiptId}/payments")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PaymentController {

    private final PaymentRepository paymentRepository;
    private final WarehouseReceiptRepository receiptRepository;
    private final UserRepository userRepository;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<?> getPayments(@PathVariable Long receiptId) {
        User user = resolveUser();
        if (user == null) return ResponseEntity.status(401).build();
        WarehouseReceipt receipt = receiptRepository.findById(receiptId).orElse(null);
        if (receipt == null) return ResponseEntity.notFound().build();
        if (!canAccess(user, receipt)) return ResponseEntity.status(403).body("Insufficient permissions");
        List<PaymentDTO> result = paymentRepository.findByReceiptIdOrderByCreatedAtDesc(receiptId)
                .stream()
                .map(PaymentDTO::fromEntity)
                .toList();
        return ResponseEntity.ok(result);
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> recordPayment(
            @PathVariable Long receiptId,
            @RequestBody PaymentRequest request
    ) {
        User user = resolveUser();
        if (user == null) return ResponseEntity.status(401).build();

        String roleName = user.getRole().getRoleName().name();
        if (!roleName.equals("ADMIN") && !roleName.equals("MANAGER") && !roleName.equals("WAREHOUSE_MANAGER")) {
            return ResponseEntity.status(403).body("Insufficient permissions");
        }

        WarehouseReceipt receipt = receiptRepository.findById(receiptId).orElse(null);
        if (receipt == null) return ResponseEntity.notFound().build();

        if (receipt.getType() != Status.TransactionType.OUTBOUND) {
            return ResponseEntity.badRequest().body("Payments can only be recorded for outbound receipts");
        }

        if (receipt.getStatus() != Status.ReceiptStatus.APPROVED && receipt.getStatus() != Status.ReceiptStatus.COMPLETED) {
            return ResponseEntity.badRequest().body("Payments can only be recorded for approved or completed receipts");
        }

        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body("Amount must be greater than 0");
        }

        BigDecimal total = calculateTotal(receipt);
        BigDecimal currentPaid = calculatePaid(receipt);
        BigDecimal remaining = total.subtract(currentPaid);

        if (request.getAmount().compareTo(remaining) > 0) {
            return ResponseEntity.badRequest().body("Payment amount exceeds remaining balance");
        }

        Status.PaymentMethod method = resolvePaymentMethod(request.getPaymentMethod());

        Payment payment = Payment.builder()
                .amount(request.getAmount())
                .paymentMethod(method)
                .note(request.getNote())
                .receipt(receipt)
                .createdBy(user)
                .build();

        paymentRepository.save(payment);

        BigDecimal newPaid = currentPaid.add(request.getAmount());
        if (newPaid.compareTo(total) >= 0) {
            receipt.setPaymentStatus(Status.PaymentStatus.PAID);
        } else {
            receipt.setPaymentStatus(Status.PaymentStatus.PARTIAL);
        }
        receiptRepository.save(receipt);

        return ResponseEntity.status(201).body(PaymentDTO.fromEntity(payment));
    }

    private boolean canAccess(User user, WarehouseReceipt receipt) {
        String roleName = user.getRole().getRoleName().name();
        if (roleName.equals("ADMIN") || roleName.equals("MANAGER")) return true;
        return user.getWarehouse() != null && user.getWarehouse().getId().equals(receipt.getWarehouse().getId());
    }

    private User resolveUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        return userRepository.findByEmail(auth.getName()).orElse(null);
    }

    private Status.PaymentMethod resolvePaymentMethod(String method) {
        if (method == null || method.isBlank()) return Status.PaymentMethod.CASH;
        try {
            return Status.PaymentMethod.valueOf(method.toUpperCase());
        } catch (IllegalArgumentException e) {
            return Status.PaymentMethod.CASH;
        }
    }

    private BigDecimal calculateTotal(WarehouseReceipt receipt) {
        BigDecimal total = BigDecimal.ZERO;
        for (ReceiptDetail d : receipt.getDetails()) {
            total = total.add(d.getPrice().multiply(BigDecimal.valueOf(d.getQuantity())));
        }
        return total;
    }

    private BigDecimal calculatePaid(WarehouseReceipt receipt) {
        BigDecimal paid = BigDecimal.ZERO;
        for (Payment p : receipt.getPayments()) {
            paid = paid.add(p.getAmount());
        }
        return paid;
    }

    public static class PaymentRequest {
        private BigDecimal amount;
        private String paymentMethod;
        private String note;

        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
        public String getPaymentMethod() { return paymentMethod; }
        public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
        public String getNote() { return note; }
        public void setNote(String note) { this.note = note; }
    }
}
