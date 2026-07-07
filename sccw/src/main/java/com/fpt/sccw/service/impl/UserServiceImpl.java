package com.fpt.sccw.service.impl;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fpt.sccw.service.*;
import com.fpt.sccw.dto.request.LoginRequest;
import com.fpt.sccw.dto.request.RegisterRequest;
import com.fpt.sccw.dto.response.AuthResponse;
import com.fpt.sccw.entity.*;
import com.fpt.sccw.repository.*;
import com.fpt.sccw.security.JwtTokenProvider;

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

    @Override
    public AuthResponse login(LoginRequest loginRequest) {
        log.info("Attempting login for user: {}", loginRequest.getEmailOrUsername());

        // Find user by email or username
        java.util.Optional<com.fpt.sccw.entity.User> userOpt = userRepository.findByEmail(loginRequest.getEmailOrUsername());
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
        Role role = roleRepository.findByRoleName(Role.RoleName.STAFF)
              .orElseThrow(() -> new RuntimeException("Default role not found"));
        User newUser = User.builder()
                .username(registerRequest.getUsername())
                .email(registerRequest.getEmail())
                .password(passwordEncoder.encode(registerRequest.getPassword()))
                .fullName(registerRequest.getFullName())
                .role(role) // Default role
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
    
}
