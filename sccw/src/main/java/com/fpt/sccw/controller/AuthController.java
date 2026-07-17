package com.fpt.sccw.controller;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;import com.fpt.sccw.dto.request.LoginRequest;
import com.fpt.sccw.dto.request.RegisterRequest;
import com.fpt.sccw.dto.response.AuthResponse;
import com.fpt.sccw.entity.ActivityLog;
import com.fpt.sccw.entity.User;
import com.fpt.sccw.repository.ActivityLogRepository;
import com.fpt.sccw.service.ActivityLogService;
import com.fpt.sccw.service.UserService;
import com.fpt.sccw.util.IpUtils;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class AuthController {
    
    private final UserService userService;
    private final ActivityLogRepository activityLogRepository;
    private final ActivityLogService activityLogService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest loginRequest, HttpServletRequest request) {
        log.info("POST /api/auth/login - User login attempt: {}", loginRequest.getEmailOrUsername());
        AuthResponse authResponse = userService.login(loginRequest);
        if (authResponse.isSuccess()) {
            logLoginActivity(authResponse, request);
            return ResponseEntity.ok(authResponse);
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(authResponse);
        }
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest registerRequest, HttpServletRequest request) {
        log.info("POST /api/auth/register - User registration attempt: {}", registerRequest.getEmail());
        AuthResponse authResponse = userService.register(registerRequest);
        if (authResponse.isSuccess()) {
            // Log the registration
            try {
                User adminUser = new User();
                // Try to resolve who created this user
                org.springframework.security.core.Authentication auth =
                        org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.isAuthenticated()) {
                    adminUser = userService.getUserByEmail(auth.getName());
                }
                if (adminUser != null && adminUser.getId() != null) {
                    activityLogService.log(adminUser, "CREATE_USER",
                            "Created user " + authResponse.getUser().getFullName()
                            + " (role: " + registerRequest.getRole() + ")", request);
                }
            } catch (Exception e) {
                log.error("Failed to log registration activity", e);
            }
            return ResponseEntity.status(HttpStatus.CREATED).body(authResponse);
        } else {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(authResponse);
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<AuthResponse> logout(@RequestHeader(value = "Authorization", required = false) String token) {
        log.info("POST /api/auth/logout - User logout attempt");
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        String message = userService.logout(token);
        return ResponseEntity.ok(AuthResponse.builder()
                .success(true)
                .message(message)
                .build());
    }

    private void logLoginActivity(AuthResponse authResponse, HttpServletRequest request) {
        try {
            User user = new User();
            user.setId(authResponse.getUser().getId());
            String ipAddress = IpUtils.getClientIp(request);
            ActivityLog activityLog = ActivityLog.builder()
                    .user(user)
                    .actionType("LOGIN")
                    .ipAddress(ipAddress)
                    .location(ipAddress)
                    .timestamp(LocalDateTime.now())
                    .build();
            activityLogRepository.save(activityLog);
        } catch (Exception e) {
            log.error("Failed to log login activity", e);
        }
    }
}
