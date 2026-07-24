package com.fpt.sccw.service;

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

public interface NotificationService {
    
    SseEmitter subscribe(String userId);

    void sendNotification(String userId, Object message);

    void broadcastEvent(String eventName, Object data);
}
