package com.fpt.sccw.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FeedbackResponseRequest {

    @NotBlank(message = "Response is required")
    @Size(max = 2000, message = "Response must be at most 2000 characters")
    private String response;
}
