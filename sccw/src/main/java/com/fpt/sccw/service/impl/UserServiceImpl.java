package com.fpt.sccw.service.impl;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fpt.sccw.service.*;
import com.fpt.sccw.dto.request.*;
import com.fpt.sccw.dto.response.*;
import com.fpt.sccw.entity.*;
import com.fpt.sccw.repository.*;
import com.fpt.sccw.security.JwtTokenProvider;

import java.util.*;

import org.springframework.security.crypto.password.PasswordEncoder;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final RoleRepository roleRepository;
    private final WarehouseRepository warehouseRepository;

    @Override
    public AuthResponse login(LoginRequest loginRequest) {
        log.info("Attempting login for user: {}", loginRequest.getEmailOrUsername());

        // Find user by email or username
        Optional<User> userOpt = userRepository.findByEmail(loginRequest.getEmailOrUsername());
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByUsername(loginRequest.getEmailOrUsername());
        }

        // Check if user exists
        if (userOpt.isEmpty()) {
            log.warn("Login failed: User not found for {}", loginRequest.getEmailOrUsername());
            return AuthResponse.builder()
                    .success(false)
                    .message("Invalid email/username or password")
                    .build();
        }

        User user = userOpt.get();

        // Check if user is active
        if (user.getIsDeleted()) {
            log.warn("Login failed: User account is inactive: {}", user.getEmail());
            return AuthResponse.builder()
                    .success(false)
                    .message("Account is inactive")
                    .build();
        }

        // Verify password
        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            log.warn("Login failed: Invalid password for user: {}", user.getEmail());
            return AuthResponse.builder()
                    .success(false)
                    .message("Invalid email/username or password")
                    .build();
        }

        // Generate JWT token
        String token = jwtTokenProvider.generateToken(
                user.getId(),
                user.getEmail(),
                user.getUsername(),
                user.getRole().getRoleName().name(),
                user.getWarehouse() != null ? user.getWarehouse().getId() : null
        );

        log.info("Login successful for user: {}", user.getEmail());

        return AuthResponse.builder()
                .success(true)
                .token(token)
                .user(AuthResponse.UserDTO.fromEntity(user))
                .message("Login successful")
                .build();
    }

    @Override
    public AuthResponse register(RegisterRequest registerRequest) {
        log.info("Attempting registration for user: {}", registerRequest.getEmail());
        
        // Check if passwords match
        if (!registerRequest.getPassword().equals(registerRequest.getConfirmPassword())) {
            log.warn("Registration failed: Passwords don't match");
            return AuthResponse.builder()
                    .success(false)
                    .message("Passwords don't match")
                    .build();
        }
        

        // Check if email already exists
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            log.warn("Registration failed: Email already exists: {}", registerRequest.getEmail());
            return AuthResponse.builder()
                    .success(false)
                    .message("Email already registered")
                    .build();
        }

        // Check if username already exists
        if (userRepository.existsByUsername(registerRequest.getUsername())) {
            log.warn("Registration failed: Username already exists: {}", registerRequest.getUsername());
            return AuthResponse.builder()
                    .success(false)
                    .message("Username already taken")
                    .build();
        }

        // Create new user 
        Role.RoleName roleNameEnum = Role.RoleName.STAFF;
        if (registerRequest.getRole() != null && !registerRequest.getRole().isEmpty()) {
            try {
                roleNameEnum = Role.RoleName.valueOf(registerRequest.getRole().toUpperCase());
            } catch (IllegalArgumentException e) {
                // Keep STAFF as default if invalid
            }
        }
        
        Role role = roleRepository.findByRoleName(roleNameEnum)
              .orElseThrow(() -> new RuntimeException("Role not found"));
              
        Warehouse warehouse = null;
        if (registerRequest.getWarehouseId() != null) {
            warehouse = warehouseRepository.findById(registerRequest.getWarehouseId())
                  .orElseThrow(() -> new RuntimeException("Warehouse not found"));
        }

        User newUser = User.builder()
                .username(registerRequest.getUsername())
                .email(registerRequest.getEmail())
                .password(passwordEncoder.encode(registerRequest.getPassword()))
                .fullName(registerRequest.getFullName())
                .phone(registerRequest.getPhone())
                .department(registerRequest.getDepartment())
                .role(role)
                .warehouse(warehouse)
                .isDeleted(false)
                .build();

        // Save user to database
        User savedUser = userRepository.save(newUser);

        // Generate JWT token
        String token = jwtTokenProvider.generateToken(
                savedUser.getId(),
                savedUser.getEmail(),
                savedUser.getUsername(),
                savedUser.getRole().getRoleName().name(),
                savedUser.getWarehouse() != null ? savedUser.getWarehouse().getId() : null
        );

        log.info("Registration successful for user: {}", savedUser.getEmail());
        
        return AuthResponse.builder()
                    .success(true)
                    .token(token)
                    .user(AuthResponse.UserDTO.fromEntity(savedUser))
                    .message("Registration successful")
                    .build();
    }

    @Override
    public String logout(String token) {
        log.info("User logout");
        return "Logout successful";
    }

    @Override
    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
    }
    
    
    @Override
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));
    }
    
    @Override
    public java.util.List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Override
    public User updateUser(Long id, String fullName, String email, String phone, String department, String roleName, Long warehouseId) {
        User user = getUserById(id);
        
        // Update basic info
        if (fullName != null && !fullName.trim().isEmpty()) {
            user.setFullName(fullName);
        }
        if (email != null && !email.trim().isEmpty()) {
            // Check if email is already used by another user
            Optional<User> existingUser = userRepository.findByEmail(email);
            if (existingUser.isPresent() && !existingUser.get().getId().equals(id)) {
                throw new RuntimeException("Email is already in use.");
            }
            user.setEmail(email);
        }
        user.setPhone(phone);
        user.setDepartment(department);

        Role.RoleName roleEnum;
        try {
            roleEnum = Role.RoleName.valueOf(roleName.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid role name: " + roleName);
        }
        
        Role role = roleRepository.findByRoleName(roleEnum)
                .orElseThrow(() -> new RuntimeException("Role not found: " + roleName));
        
        user.setRole(role);
        
        if (roleEnum == Role.RoleName.ADMIN || roleEnum == Role.RoleName.MANAGER) {
            user.setWarehouse(null);
        } else {
            if (warehouseId == null) {
                throw new RuntimeException("Warehouse ID is required for role: " + roleName);
            }
            Warehouse warehouse = warehouseRepository.findById(warehouseId)
                    .orElseThrow(() -> new RuntimeException("Warehouse not found: " + warehouseId));
            user.setWarehouse(warehouse);
        }
        
        return userRepository.save(user);
    }

    @Override
    public User updateProfile(Long id, String fullName, String email, String phone, String avatarUrl) {
        User user = getUserById(id);
        
        if (fullName != null && !fullName.trim().isEmpty()) {
            user.setFullName(fullName);
        }
        if (email != null && !email.trim().isEmpty()) {
            Optional<User> existingUser = userRepository.findByEmail(email);
            if (existingUser.isPresent() && !existingUser.get().getId().equals(id)) {
                throw new RuntimeException("Email is already in use.");
            }
            user.setEmail(email);
        }
        if (phone != null) user.setPhone(phone);
        if (avatarUrl != null) user.setAvatar(avatarUrl);
        
        return userRepository.save(user);
    }

    @Override
    public void changePassword(Long id, String currentPassword, String newPassword) {
        User user = getUserById(id);
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new RuntimeException("Current password is incorrect.");
        }
        if (newPassword == null || newPassword.length() < 8) {
            throw new RuntimeException("New password must be at least 8 characters long.");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Override
    public void deleteUser(Long id) {
        User user = getUserById(id);
        user.setIsDeleted(true);
        userRepository.save(user);
    }

    @Override
    public void activateUser(Long id) {
        User user = getUserById(id);
        user.setIsDeleted(false);
        userRepository.save(user);
    }

    @Override
    public void hardDeleteUser(Long id) {
        try {
            userRepository.deleteById(id);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new RuntimeException("Cannot permanently delete this user because they are linked to existing records (receipts, transfers, etc). Please keep them as Deactive.");
        }
    }
}
