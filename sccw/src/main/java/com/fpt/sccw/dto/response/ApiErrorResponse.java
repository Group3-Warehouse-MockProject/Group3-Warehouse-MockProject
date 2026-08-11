package com.fpt.sccw.dto.response;

import java.util.Map;

public record ApiErrorResponse(String message, String code, Map<String, String> errors) {

    public static ApiErrorResponse of(String message, String code) {
        return new ApiErrorResponse(message, code, null);
    }

    public static ApiErrorResponse validation(Map<String, String> errors) {
        return new ApiErrorResponse("Please correct the highlighted fields.", "VALIDATION_ERROR", errors);
    }
}
