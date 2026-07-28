package com.fpt.sccw.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FeedbackRequest {

    @NotBlank(message = "Feedback category is required")
    @Size(max = 30, message = "Feedback category is too long")
    private String category;

    @NotBlank(message = "Feedback message is required")
    @Size(max = 2000, message = "Feedback message must be at most 2000 characters")
    private String message;
}
