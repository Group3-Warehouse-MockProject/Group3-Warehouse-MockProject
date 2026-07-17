package com.fpt.sccw.controller;

import com.fpt.sccw.dto.response.UserDTO;
import com.fpt.sccw.entity.User;
import com.fpt.sccw.service.ActivityLogService;
import com.fpt.sccw.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserController {

    private final UserService userService;
    private final ActivityLogService activityLogService;

    @GetMapping
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        List<User> users = userService.getAllUsers();
        List<UserDTO> userDTOs = users.stream()
                .map(UserDTO::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(userDTOs);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserDTO> updateUser(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request
    ) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        String fullName = (String) request.get("fullName");
        String email = (String) request.get("email");
        String phone = (String) request.get("phone");
        String department = (String) request.get("department");
        String role = (String) request.get("role");
        
        Long warehouseId = null;
        if (request.get("warehouseId") != null && !request.get("warehouseId").toString().isEmpty()) {
            warehouseId = Long.valueOf(request.get("warehouseId").toString());
        }

        User updatedUser = userService.updateUser(id, fullName, email, phone, department, role, warehouseId);

        User currentUser = resolveUser();
        if (currentUser != null) {
            activityLogService.log(currentUser, "UPDATE_USER",
                    "Updated user " + updatedUser.getFullName() + " (role: " + role + ")");
        }

        return ResponseEntity.ok(UserDTO.fromEntity(updatedUser));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        User currentUser = userService.getUserByEmail(auth.getName());
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(UserDTO.fromEntity(currentUser));
    }

    @PutMapping("/profile")
    public ResponseEntity<UserDTO> updateProfile(@RequestBody Map<String, Object> request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        
        User currentUser = userService.getUserByEmail(auth.getName()); // username is email in our setup
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }

        String fullName = (String) request.get("fullName");
        String email = (String) request.get("email");
        String phone = (String) request.get("phone");
        String avatarUrl = (String) request.get("avatarUrl");

        User updatedUser = userService.updateProfile(currentUser.getId(), fullName, email, phone, avatarUrl);
        return ResponseEntity.ok(UserDTO.fromEntity(updatedUser));
    }

    private User resolveUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        return userService.getUserByEmail(auth.getName());
    }

    @PutMapping("/profile/password")
    public ResponseEntity<Map<String, String>> changePassword(@RequestBody Map<String, String> request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }
        
        User currentUser = userService.getUserByEmail(auth.getName());
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }

        String currentPassword = request.get("currentPassword");
        String newPassword = request.get("newPassword");

        try {
            userService.changePassword(currentUser.getId(), currentPassword, newPassword);
            return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        userService.deleteUser(id);

        User currentUser = resolveUser();
        if (currentUser != null) {
            User deletedUser = userService.getUserById(id);
            activityLogService.log(currentUser, "DEACTIVATE_USER",
                    "Deactivated user " + (deletedUser != null ? deletedUser.getFullName() : "#" + id));
        }

        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/activate")
    public ResponseEntity<Void> activateUser(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        userService.activateUser(id);

        User currentUser = resolveUser();
        if (currentUser != null) {
            User activatedUser = userService.getUserById(id);
            activityLogService.log(currentUser, "ACTIVATE_USER",
                    "Activated user " + (activatedUser != null ? activatedUser.getFullName() : "#" + id));
        }

        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/hard")
    public ResponseEntity<Void> hardDeleteUser(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        userService.hardDeleteUser(id);

        User currentUser = resolveUser();
        if (currentUser != null) {
            activityLogService.log(currentUser, "DELETE_USER",
                    "Permanently deleted user #" + id);
        }

        return ResponseEntity.noContent().build();
    }
}
