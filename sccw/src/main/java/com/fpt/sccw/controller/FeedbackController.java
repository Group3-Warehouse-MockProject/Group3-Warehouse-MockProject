package com.fpt.sccw.controller;

import com.fpt.sccw.dto.request.FeedbackRequest;
import com.fpt.sccw.dto.request.FeedbackResponseRequest;
import com.fpt.sccw.dto.response.FeedbackDTO;
import com.fpt.sccw.entity.Feedback;
import com.fpt.sccw.entity.Role;
import com.fpt.sccw.entity.User;
import com.fpt.sccw.repository.FeedbackRepository;
import com.fpt.sccw.service.UserService;
import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PutMapping;

@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackRepository feedbackRepository;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<FeedbackDTO>> getFeedback() {
        User user = getCurrentUser();
        if (user == null) return ResponseEntity.status(401).build();

        List<Feedback> feedback;
        if (isGlobalReviewer(user)) {
            feedback = feedbackRepository.findAllByOrderByCreatedAtDesc();
        } else if (isWarehouseReviewer(user) && user.getWarehouse() != null) {
            feedback = feedbackRepository.findByUserWarehouseIdOrderByCreatedAtDesc(user.getWarehouse().getId());
        } else {
            feedback = feedbackRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        }
        return ResponseEntity.ok(feedback.stream().map(FeedbackDTO::fromEntity).toList());
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> submit(@Valid @RequestBody FeedbackRequest request) {
        User user = getCurrentUser();
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        Feedback feedback = new Feedback();
        feedback.setUser(user);
        feedback.setCategory(request.getCategory().trim());
        feedback.setMessage(request.getMessage().trim());
        feedback.setRating(request.getRating());
        feedbackRepository.save(feedback);

        return ResponseEntity.ok(Map.of("message", "Thank you for your feedback."));
    }

    @PutMapping("/{id}/response")
    public ResponseEntity<?> respond(@PathVariable Long id, @Valid @RequestBody FeedbackResponseRequest request) {
        User reviewer = getCurrentUser();
        if (reviewer == null) return ResponseEntity.status(401).build();
        if (!isReviewer(reviewer)) return ResponseEntity.status(403).body(Map.of("message", "You are not allowed to respond to feedback."));

        Feedback feedback = feedbackRepository.findById(id).orElse(null);
        if (feedback == null) return ResponseEntity.notFound().build();
        if (isWarehouseReviewer(reviewer) && !isGlobalReviewer(reviewer)
                && (feedback.getUser().getWarehouse() == null || reviewer.getWarehouse() == null
                || !feedback.getUser().getWarehouse().getId().equals(reviewer.getWarehouse().getId()))) {
            return ResponseEntity.status(403).body(Map.of("message", "You can only respond to feedback from your warehouse."));
        }

        feedback.setResponse(request.getResponse().trim());
        feedback.setRespondedBy(reviewer);
        feedback.setRespondedAt(LocalDateTime.now());
        return ResponseEntity.ok(FeedbackDTO.fromEntity(feedbackRepository.save(feedback)));
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) return null;
        return userService.getUserByEmail(authentication.getName());
    }

    private boolean isGlobalReviewer(User user) {
        return user.getRole().getRoleName() == Role.RoleName.ADMIN || user.getRole().getRoleName() == Role.RoleName.MANAGER;
    }

    private boolean isWarehouseReviewer(User user) {
        return user.getRole().getRoleName() == Role.RoleName.WAREHOUSE_MANAGER;
    }

    private boolean isReviewer(User user) {
        return isGlobalReviewer(user) || isWarehouseReviewer(user);
    }
}
