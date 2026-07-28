package com.fpt.sccw.service.impl;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.fpt.sccw.service.*;
import com.fpt.sccw.dto.response.NotificationEventDTO;
import com.fpt.sccw.entity.Feedback;
import com.fpt.sccw.entity.Notification;
import com.fpt.sccw.entity.Role;
import com.fpt.sccw.entity.User;
import com.fpt.sccw.repository.NotificationRepository;
import com.fpt.sccw.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    private final Map<String, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    @Override
    public SseEmitter subscribe(String userId) {
        SseEmitter emitter = new SseEmitter(600_000L);
        
        this.emitters.compute(userId, (k, userEmitters) -> {
            if (userEmitters == null) {
                userEmitters = new CopyOnWriteArrayList<>();
            }
            userEmitters.add(emitter);
            return userEmitters;
        });

        emitter.onCompletion(() -> removeEmitter(userId, emitter));
        emitter.onTimeout(() -> removeEmitter(userId, emitter));
        emitter.onError((ex) -> removeEmitter(userId, emitter));

        try {
            emitter.send(SseEmitter.event().name("INIT").data("Connect sucessful!"));
        } catch (Exception e) {
            removeEmitter(userId, emitter);
            emitter.completeWithError(e);
        }

        return emitter;
    }

    private void removeEmitter(String userId, SseEmitter emitter) {
        this.emitters.computeIfPresent(userId, (k, userEmitters) -> {
            userEmitters.remove(emitter);
            return userEmitters.isEmpty() ? null : userEmitters;
        });
    }

    @Override
    public void sendNotification(String userId, Object message) {
        if (message instanceof NotificationEventDTO) {
            NotificationEventDTO dto = (NotificationEventDTO) message;
            try {
                Long uid = Long.parseLong(userId);
                User user = userRepository.findById(uid).orElse(null);
                if (user != null) {
                    Notification notif = Notification.builder()
                            .user(user)
                            .title(dto.getTitle())
                            .message(dto.getMessage())
                            .type(dto.getType())
                            .isRead(false)
                            .build();
                    notificationRepository.save(notif);
                    // Update DTO id with real database id
                    dto.setId(notif.getId().toString());
                    dto.setCreatedAt(notif.getCreatedAt() != null ? notif.getCreatedAt().toString() : java.time.Instant.now().toString());
                    message = dto;
                }
            } catch (NumberFormatException e) {
                log.warn("Invalid user ID format for notification: {}", userId);
            }
        }

        List<SseEmitter> userEmitters = this.emitters.get(userId);
        if (userEmitters != null) {
            for (SseEmitter emitter : userEmitters) {
                try {
                    emitter.send(SseEmitter.event().name("NOTIFICATION").data(message));
                } catch (Exception e) {
                    removeEmitter(userId, emitter);
                    emitter.completeWithError(e);
                }
            }
        }
    }

    @Override
    public void broadcastEvent(String eventName, Object data) {
        this.emitters.forEach((userId, userEmitters) -> {
            for (SseEmitter emitter : userEmitters) {
                try {
                    emitter.send(SseEmitter.event().name(eventName).data(data));
                } catch (Exception e) {
                    removeEmitter(userId, emitter);
                    emitter.completeWithError(e);
                }
            }
        });
    }

    @Override
    public void notifyReviewersOfFeedback(Feedback feedback) {
        Long warehouseId = feedback.getUser().getWarehouse() == null
                ? null : feedback.getUser().getWarehouse().getId();

        userRepository.findByIsDeletedFalse().stream()
                .filter(user -> isReviewerForFeedback(user, warehouseId))
                .forEach(user -> sendNotification(user.getId().toString(), NotificationEventDTO.builder()
                        .userId(user.getId().toString())
                        .title("New feedback needs a response")
                        .message(feedback.getUser().getFullName() + " submitted "
                                + feedback.getCategory().toLowerCase() + " feedback.")
                        .type("INFO")
                        .createdAt(java.time.Instant.now().toString())
                        .isRead(false)
                        .build()));
    }

    @Override
    public void notifySubmitterOfResponse(Feedback feedback) {
        User submitter = feedback.getUser();
        String responder = feedback.getRespondedBy() == null
                ? "A reviewer" : feedback.getRespondedBy().getFullName();

        sendNotification(submitter.getId().toString(), NotificationEventDTO.builder()
                .userId(submitter.getId().toString())
                .title("Your feedback has been answered")
                .message(responder + " responded to your " + feedback.getCategory().toLowerCase() + " feedback.")
                .type("SUCCESS")
                .createdAt(java.time.Instant.now().toString())
                .isRead(false)
                .build());
    }

    private boolean isReviewerForFeedback(User user, Long submitterWarehouseId) {
        if (user.getRole() == null) {
            return false;
        }
        Role.RoleName role = user.getRole().getRoleName();
        if (role == Role.RoleName.ADMIN || role == Role.RoleName.MANAGER) {
            return true;
        }
        return role == Role.RoleName.WAREHOUSE_MANAGER
                && submitterWarehouseId != null
                && user.getWarehouse() != null
                && submitterWarehouseId.equals(user.getWarehouse().getId());
    }

}
