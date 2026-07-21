package com.fpt.sccw.dto.response;

import com.fpt.sccw.entity.Feedback;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FeedbackDTO {
    private Long id;
    private String category;
    private String message;
    private Integer rating;
    private LocalDateTime createdAt;
    private String submittedBy;
    private String submittedByRole;
    private String response;
    private String respondedBy;
    private LocalDateTime respondedAt;

    public static FeedbackDTO fromEntity(Feedback feedback) {
        return FeedbackDTO.builder()
                .id(feedback.getId())
                .category(feedback.getCategory())
                .message(feedback.getMessage())
                .rating(feedback.getRating())
                .createdAt(feedback.getCreatedAt())
                .submittedBy(feedback.getUser().getFullName())
                .submittedByRole(feedback.getUser().getRole().getRoleName().name())
                .response(feedback.getResponse())
                .respondedBy(feedback.getRespondedBy() == null ? null : feedback.getRespondedBy().getFullName())
                .respondedAt(feedback.getRespondedAt())
                .build();
    }
}
