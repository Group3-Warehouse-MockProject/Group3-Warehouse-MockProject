package com.fpt.sccw.controller;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.fpt.sccw.dto.response.NotificationEventDTO;
import com.fpt.sccw.entity.Notification;
import com.fpt.sccw.repository.NotificationRepository;
import com.fpt.sccw.service.NotificationService;

import lombok.*;
import org.springframework.web.bind.annotation.PostMapping;


@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class NotificationController {
    
    private final NotificationService notificationService;
    private final NotificationRepository notificationRepository;
    private final ApplicationEventPublisher eventPublisher;


    @GetMapping(value = "/subscribe/{userId}", produces = org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(@PathVariable String userId) {
        return notificationService.subscribe(userId);
    }

    
    @PostMapping("/trigger")
    public void triggerNotification(@RequestParam String userId, @RequestParam String title, @RequestParam String message, @RequestParam(defaultValue = "INFO") String type) {
        NotificationEventDTO event = NotificationEventDTO.builder()
                .id(java.util.UUID.randomUUID().toString())
                .userId(userId)
                .title(title)
                .message(message)
                .type(type)
                .createdAt(java.time.Instant.now().toString())
                .build();
        eventPublisher.publishEvent(event);
    }

    @GetMapping("/{userId}")
    public org.springframework.http.ResponseEntity<?> getNotifications(@PathVariable Long userId) {
        java.util.List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        java.util.List<NotificationEventDTO> dtos = notifications.stream().map(notif -> NotificationEventDTO.builder()
                .id(notif.getId().toString())
                .userId(notif.getUser().getId().toString())
                .title(notif.getTitle())
                .message(notif.getMessage())
                .type(notif.getType())
                .createdAt(notif.getCreatedAt() != null ? notif.getCreatedAt().toString() : "")
                .isRead(notif.isRead())
                .build()).collect(java.util.stream.Collectors.toList());
        return org.springframework.http.ResponseEntity.ok(dtos);
    }

    @PatchMapping("/{userId}/read/{notifId}")
    public org.springframework.http.ResponseEntity<?> markAsRead(@PathVariable Long userId, @PathVariable Long notifId) {
        Notification notif = notificationRepository.findById(notifId).orElse(null);
        if (notif != null && notif.getUser().getId().equals(userId)) {
            notif.setRead(true);
            notificationRepository.save(notif);
        }
        return org.springframework.http.ResponseEntity.ok().build();
    }

    @PatchMapping("/{userId}/read-all")
    public org.springframework.http.ResponseEntity<?> markAllAsRead(@PathVariable Long userId) {
        java.util.List<Notification> notifications = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        for (Notification notif : notifications) {
            if (!notif.isRead()) {
                notif.setRead(true);
            }
        }
        notificationRepository.saveAll(notifications);
        return org.springframework.http.ResponseEntity.ok().build();
    }
}