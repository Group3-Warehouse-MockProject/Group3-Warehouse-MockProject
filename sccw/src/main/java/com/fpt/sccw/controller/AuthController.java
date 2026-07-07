package com.fpt.sccw.controller;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

import com.fpt.sccw.dto.request.LoginRequest;
import com.fpt.sccw.dto.request.RegisterRequest;
import com.fpt.sccw.dto.response.AuthResponse;
import com.fpt.sccw.service.*;

import jakarta.validation.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class AuthController {
    
    private final UserService userService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        log.info("POST /api/auth/login - User login attempt: {}", loginRequest.getEmailOrUsername());
        AuthResponse authResponse = userService.login(loginRequest);
        if (authResponse.isSuccess()) {
            return ResponseEntity.ok(authResponse);
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(authResponse);
        }
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest registerRequest) {
        log.info("POST /api/auth/register - User registration attempt: {}", registerRequest.getEmail());
        AuthResponse authResponse = userService.register(registerRequest);
        if (authResponse.isSuccess()) {
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
}
