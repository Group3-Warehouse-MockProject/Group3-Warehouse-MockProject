package com.fpt.sccw.controller;

import com.fpt.sccw.dto.response.ActivityLogDTO;
import com.fpt.sccw.entity.ActivityLog;
import com.fpt.sccw.entity.User;
import com.fpt.sccw.repository.ActivityLogRepository;
import com.fpt.sccw.repository.UserRepository;
import com.fpt.sccw.service.ActivityLogService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/logs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ActivityLogController {

    private final ActivityLogRepository activityLogRepository;
    private final UserRepository userRepository;
    private final ActivityLogService activityLogService;

    @PostMapping("/page-view")
    public ResponseEntity<?> logPageView(@RequestBody Map<String, String> payload, HttpServletRequest request) {
        User user = resolveUser();
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        activityLogService.log(user, "PAGE_VIEW", null, request, payload.get("pageUrl"));
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<Page<ActivityLogDTO>> getLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String actionType
    ) {
        User user = resolveUser();
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        String roleName = user.getRole().getRoleName().name();
        if (!roleName.equals("ADMIN")) {
            return ResponseEntity.status(403).build();
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp"));
        Page<ActivityLog> logPage = activityLogRepository.findByFilters(
                actionType != null && !actionType.isBlank() ? actionType : null,
                search != null && !search.isBlank() ? search : null,
                pageable
        );
        return ResponseEntity.ok(logPage.map(this::toDTO));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<Page<ActivityLogDTO>> getUserLogs(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        User user = resolveUser();
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        String roleName = user.getRole().getRoleName().name();
        if (!roleName.equals("ADMIN") && !roleName.equals("MANAGER")) {
            return ResponseEntity.status(403).build();
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp"));
        Page<ActivityLog> logPage = activityLogRepository.findByUserIdOrderByTimestampDesc(userId, pageable);
        return ResponseEntity.ok(logPage.map(this::toDTO));
    }

    @DeleteMapping("/clear")
    public ResponseEntity<?> clearAllLogs() {
        User user = resolveUser();
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        String roleName = user.getRole().getRoleName().name();
        if (!roleName.equals("ADMIN")) {
            return ResponseEntity.status(403).body("Only admins can clear activity logs");
        }

        activityLogRepository.deleteAll();
        return ResponseEntity.ok(Map.of("message", "All activity logs cleared successfully"));
    }

    private User resolveUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) return null;
        return userRepository.findByEmail(auth.getName()).orElse(null);
    }

    private ActivityLogDTO toDTO(ActivityLog log) {
        ActivityLogDTO.UserSummary userSummary = null;
        if (log.getUser() != null) {
            userSummary = ActivityLogDTO.UserSummary.builder()
                    .id(log.getUser().getId())
                    .username(log.getUser().getUsername())
                    .fullName(log.getUser().getFullName())
                    .role(log.getUser().getRole() != null ? log.getUser().getRole().getRoleName().name() : null)
                    .build();
        }
        return ActivityLogDTO.builder()
                .id(log.getId())
                .actionType(log.getActionType())
                .pageUrl(log.getPageUrl())
                .details(log.getDetails())
                .ipAddress(log.getIpAddress())
                .location(log.getLocation())
                .timestamp(log.getTimestamp())
                .user(userSummary)
                .build();
    }
}
