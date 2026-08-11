package com.fpt.sccw.exception;

import com.fpt.sccw.dto.response.ApiErrorResponse;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final String GENERIC_ERROR_MESSAGE = "We couldn't complete your request. Please try again.";

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiErrorResponse> handleRuntimeException(RuntimeException exception) {
        if ("Unauthenticated".equals(exception.getMessage())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiErrorResponse.of("Your session has expired. Please sign in again.", "UNAUTHENTICATED"));
        }

        String message = exception.getMessage();
        if (message == null || containsTechnicalDetails(message)) {
            log.error("Unexpected runtime API error", exception);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiErrorResponse.of(GENERIC_ERROR_MESSAGE, "INTERNAL_ERROR"));
        }

        return ResponseEntity.badRequest()
                .body(ApiErrorResponse.of(message, "REQUEST_INVALID"));
    }

    private boolean containsTechnicalDetails(String message) {
        String normalized = message.toLowerCase();
        return normalized.contains("sql")
                || normalized.contains("jdbc")
                || normalized.contains("hibernate")
                || normalized.contains("constraint")
                || normalized.contains("duplicate entry")
                || normalized.contains("postgres")
                || normalized.contains("mysql")
                || normalized.contains("exception");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException exception) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors()
                .forEach(error -> fieldErrors.putIfAbsent(error.getField(), error.getDefaultMessage()));
        return ResponseEntity.badRequest().body(ApiErrorResponse.validation(fieldErrors));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleBadRequest(IllegalArgumentException exception) {
        return ResponseEntity.badRequest()
                .body(ApiErrorResponse.of(exception.getMessage(), "REQUEST_INVALID"));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiErrorResponse> handleConflict(IllegalStateException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiErrorResponse.of(exception.getMessage(), "CONFLICT"));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataIntegrityViolation(DataIntegrityViolationException exception) {
        log.warn("Request conflicted with existing data", exception);
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiErrorResponse.of("This action conflicts with existing data. Please review your entries and try again.", "CONFLICT"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpectedException(Exception exception) {
        log.error("Unexpected API error", exception);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiErrorResponse.of(GENERIC_ERROR_MESSAGE, "INTERNAL_ERROR"));
    }
}
