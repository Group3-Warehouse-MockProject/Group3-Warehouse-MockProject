package com.fpt.sccw.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.*;

import javax.crypto.SecretKey;

@Component
public class JwtTokenProvider {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration}")
    private long jwtExpirationMs;

    /**
     * Generate JWT token for user
     * @param userId user ID
     * @param email user email
     * @param username user username
     * @param role user role
     * @param warehouseId user warehouse ID
     * @return JWT token
     */
    public String generateToken(Long userId, String email, String username, String role, Long warehouseId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("username", username);
        claims.put("role", role);
        claims.put("warehouseId", warehouseId);

        return createToken(claims, email);
    }


    /**
     * Create JWT token
     * @param claims token claims
     * @param subject token subject (usually email or username)
     * @return JWT token string
     */
    private String createToken(Map<String, Object> claims, String subject) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes());

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(key, SignatureAlgorithm.HS512)
                .compact();
    }


    /**
     * Extract email from JWT token
     * @param token JWT token
     * @return email from token
     */
    public String getEmailFromToken(String token) {
        return getAllClaimsFromToken(token).getSubject();
    }


    /**
     * Extract user ID from JWT token
     * @param token JWT token
     * @return user ID from token
     */
    public Long getUserIdFromToken(String token) {
        Claims claims = getAllClaimsFromToken(token);
        return ((Number) claims.get("userId")).longValue();
    }

    /**
     * Extract all claims from JWT token
     * @param token JWT token
     * @return claims from token
     */
    private Claims getAllClaimsFromToken(String token) {
        SecretKey key = Keys.hmacShaKeyFor(jwtSecret.getBytes());
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
    
    /**
     * Extract warehouse ID from JWT token
     * @param token JWT token
     * @return warehouse ID from token, or null if not present
     */
    public Long getWarehouseIdFromToken(String token) {
        Claims claims = getAllClaimsFromToken(token);
        Object warehouseIdObj = claims.get("warehouseId");
        if (warehouseIdObj != null) {
            return ((Number) warehouseIdObj).longValue();
        }
        return null;
    }
    
}
