package com.fpt.sccw.dto.response;

import com.fpt.sccw.entity.Payment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentDTO {
    private Long id;
    private BigDecimal amount;
    private String paymentMethod;
    private String referenceCode;
    private String note;
    private String createdAt;
    private String createdBy;

    public static PaymentDTO fromEntity(Payment payment) {
        return PaymentDTO.builder()
                .id(payment.getId())
                .amount(payment.getAmount())
                .paymentMethod(payment.getPaymentMethod() != null ? payment.getPaymentMethod().name() : null)
                .referenceCode(payment.getReferenceCode())
                .note(payment.getNote())
                .createdAt(payment.getCreatedAt() != null ? payment.getCreatedAt().toString() : null)
                .createdBy(payment.getCreatedBy() != null ? payment.getCreatedBy().getFullName() : null)
                .build();
    }
}
