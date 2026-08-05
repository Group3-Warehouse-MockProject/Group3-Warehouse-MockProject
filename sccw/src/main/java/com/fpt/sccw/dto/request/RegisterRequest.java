package com.fpt.sccw.dto.request;

import jakarta.validation.constraints.*;
import jakarta.validation.constraints.Pattern;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterRequest {
    
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String email;
    
    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(
        regexp = "^(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?`~]).*$",
        message = "Password must contain at least 1 uppercase letter, 1 digit, and 1 special character"
    )
    private String password;
    
    @NotBlank(message = "Confirm password is required")
    private String confirmPassword;
    
    private String fullName;
    
    @NotBlank(message = "Phone number is required")
    private String phone;
    
    @NotBlank(message = "Department is required")
    private String department;
    
    private String role;
    
    private Long warehouseId;
    
}
