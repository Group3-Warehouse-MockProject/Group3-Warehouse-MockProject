package com.fpt.sccw.service;

import com.fpt.sccw.entity.ActivityLog;
import com.fpt.sccw.entity.User;
import com.fpt.sccw.repository.ActivityLogRepository;
import com.fpt.sccw.util.IpUtils;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;

    @Transactional
    public void log(User user, String actionType, String details) {
        log(user, actionType, details, null, null);
    }

    @Transactional
    public void log(User user, String actionType, String details, HttpServletRequest request) {
        log(user, actionType, details, request, null);
    }

    @Transactional
    public void log(User user, String actionType, String details, HttpServletRequest request, String pageUrl) {
        String ipAddress = null;
        if (request != null) {
            ipAddress = IpUtils.getClientIp(request);
        }

        ActivityLog log = ActivityLog.builder()
                .user(user)
                .actionType(actionType)
                .details(details)
                .pageUrl(pageUrl)
                .ipAddress(ipAddress)
                .location(ipAddress)
                .timestamp(LocalDateTime.now())
                .build();

        activityLogRepository.save(log);
    }
}
