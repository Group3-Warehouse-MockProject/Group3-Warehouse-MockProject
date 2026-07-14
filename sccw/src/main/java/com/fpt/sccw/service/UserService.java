package com.fpt.sccw.service;

import com.fpt.sccw.dto.request.LoginRequest;
import com.fpt.sccw.dto.request.RegisterRequest;
import com.fpt.sccw.dto.response.AuthResponse;
import com.fpt.sccw.entity.*;

public interface UserService {

    /**
     * Authenticate user with email/username and password
     * @param loginRequest login credentials
     * @return authentication response with token and user info
     */
    AuthResponse login(LoginRequest loginRequest);

    /**
     * Register new user
     * @param registerRequest registration data
     * @return authentication response with token and user info
     */
    AuthResponse register(RegisterRequest registerRequest);

    /**
     * Logout user
     * @param token JWT token (optional, can be used for token blacklisting)
     * @return  logout message
     */
    String logout(String token);

    /**
     * Get user by ID
     * @param id user ID
     * @return  user entity
     */
    User getUserById(Long id);

    /**
     * Get user by email
     * @param email user email
     * @return  user entity
     */
    User getUserByEmail(String email);

    /**
     * Get all active users
     * @return list of all users where isDeleted is false
     */
    java.util.List<User> getAllUsers();

    /**
     * Update user information (admin/manager)
     * @param id user ID
     * @param fullName full name
     * @param email email
     * @param phone phone
     * @param department department
     * @param roleName new role name
     * @param warehouseId assigned warehouse ID
     * @return updated user entity
     */
    User updateUser(Long id, String fullName, String email, String phone, String department, String roleName, Long warehouseId);

    /**
     * Update user profile (self)
     * @param id user ID
     * @param fullName full name
     * @param email email
     * @param phone phone
     * @param avatarUrl avatar URL
     * @return updated user entity
     */
    User updateProfile(Long id, String fullName, String email, String phone, String avatarUrl);

    /**
     * Change user password
     * @param id user ID
     * @param currentPassword current password
     * @param newPassword new password
     */
    void changePassword(Long id, String currentPassword, String newPassword);

    /**
     * Soft delete user
     * @param id user ID
     */
    void deleteUser(Long id);

    /**
     * Activate user
     * @param id user ID
     */
    void activateUser(Long id);

    /**
     * Hard delete user permanently
     * @param id user ID
     */
    void hardDeleteUser(Long id);
}
