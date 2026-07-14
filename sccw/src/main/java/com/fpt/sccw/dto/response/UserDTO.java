package com.fpt.sccw.dto.response;

import com.fpt.sccw.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private String phone;
    private String department;
    private String role;
    private Long warehouseId;
    private Boolean isDeleted;
    private String avatarUrl;
    
    // Derived properties for frontend matching
    private String initials;
    private String title;

    public static UserDTO fromEntity(User user) {
        String init = user.getFullName() != null && !user.getFullName().isEmpty() 
            ? user.getFullName().substring(0, 1).toUpperCase() 
            : "U";
            
        String t = user.getDepartment() != null && !user.getDepartment().isEmpty()
            ? user.getDepartment() + " Member"
            : "Staff Member";
            
        if (user.getRole().getRoleName().name().equals("ADMIN")) t = "System Administrator";
        else if (user.getRole().getRoleName().name().equals("MANAGER")) t = "Regional Manager";
        else if (user.getRole().getRoleName().name().equals("WAREHOUSE_MANAGER")) t = "Warehouse Supervisor";

        return UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .department(user.getDepartment())
                .role(user.getRole().getRoleName().name())
                .warehouseId(user.getWarehouse() != null ? user.getWarehouse().getId() : null)
                .isDeleted(user.getIsDeleted())
                .avatarUrl(user.getAvatar())
                .initials(init)
                .title(t)
                .build();
    }
}
