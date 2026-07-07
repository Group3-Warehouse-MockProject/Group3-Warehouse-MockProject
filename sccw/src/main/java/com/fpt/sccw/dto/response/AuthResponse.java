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
        private String role;
        private Long warehouseId;
    
        public static UserDTO fromEntity(User user) {
            return UserDTO.builder()
                    .id(user.getId())
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .avatarUrl(user.getAvatar())
                    .role(user.getRole().getRoleName().toString())
                    .warehouseId(user.getWarehouse() != null ? user.getWarehouse().getId() : null)
                    .build();
        }
    }

}
