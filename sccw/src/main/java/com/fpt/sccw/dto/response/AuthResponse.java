package com.fpt.sccw.dto.response;

import com.fpt.sccw.entity.User;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String refreshToken;
    private UserDTO user;
    private String message;
    private boolean success;
    @com.fasterxml.jackson.annotation.JsonProperty("isFirstLogin")
    private boolean isFirstLogin;
    @com.fasterxml.jackson.annotation.JsonProperty("needsPolicyAcceptance")
    private boolean needsPolicyAcceptance;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserDTO {
        private Long id;
        private String username;
        private String email;
        private String fullName;
        private String avatarUrl;
        private String phone;
        private String department;
        private String role;
        private Long warehouseId;
    
        public static UserDTO fromEntity(User user) {
            return UserDTO.builder()
                    .id(user.getId())
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .avatarUrl(user.getAvatar())
                    .phone(user.getPhone())
                    .department(user.getDepartment())
                    .role(user.getRole().getRoleName().toString())
                    .warehouseId(user.getWarehouse() != null ? user.getWarehouse().getId() : null)
                    .build();
        }
    }

}
