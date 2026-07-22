package com.fpt.sccw.service;

import com.fpt.sccw.entity.Feedback;
import com.fpt.sccw.entity.Role;
import com.fpt.sccw.entity.User;
import com.fpt.sccw.repository.UserRepository;
import java.util.LinkedHashSet;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class FeedbackEmailService {

    private final JavaMailSender mailSender;
    private final UserRepository userRepository;

    @Value("${spring.mail.username:}")
    private String senderAddress;

    @Value("${feedback.notification.email:}")
    private String configuredRecipient;

    @Async
    public void notifyReviewers(Feedback feedback) {
        Set<String> recipients = new LinkedHashSet<>();
        if (configuredRecipient != null && !configuredRecipient.isBlank()) {
            recipients.add(configuredRecipient.trim());
        }

        Long senderWarehouseId = feedback.getUser().getWarehouse() == null
                ? null : feedback.getUser().getWarehouse().getId();
        for (User reviewer : userRepository.findByIsDeletedFalse()) {
            if (reviewer.getEmail() == null || reviewer.getEmail().isBlank() || reviewer.getRole() == null) continue;
            Role.RoleName role = reviewer.getRole().getRoleName();
            boolean globalReviewer = role == Role.RoleName.ADMIN || role == Role.RoleName.MANAGER;
            boolean warehouseReviewer = role == Role.RoleName.WAREHOUSE_MANAGER
                    && senderWarehouseId != null
                    && reviewer.getWarehouse() != null
                    && senderWarehouseId.equals(reviewer.getWarehouse().getId());
            if (globalReviewer || warehouseReviewer) recipients.add(reviewer.getEmail());
        }

        if (senderAddress == null || senderAddress.isBlank()) {
            log.warn("Feedback #{} saved, but email was skipped because MAIL_USERNAME is not configured", feedback.getId());
            return;
        }
        if (recipients.isEmpty()) {
            log.warn("Feedback #{} saved, but no reviewer email address was found", feedback.getId());
            return;
        }

        SimpleMailMessage email = new SimpleMailMessage();
        email.setFrom(senderAddress);
        email.setBcc(recipients.toArray(String[]::new));
        email.setSubject("[TechStock] New feedback #" + feedback.getId());
        email.setText(buildBody(feedback));

        try {
            mailSender.send(email);
            log.info("Feedback #{} notification sent to {} reviewer(s)", feedback.getId(), recipients.size());
        } catch (Exception exception) {
            log.error("Feedback #{} was saved, but its email notification failed", feedback.getId(), exception);
        }
    }

    private String buildBody(Feedback feedback) {
        User sender = feedback.getUser();
        String warehouse = sender.getWarehouse() == null
                ? "Not assigned" : sender.getWarehouse().getWarehouseName();
        return "A new feedback has been submitted.\n\n"
                + "Feedback ID: " + feedback.getId() + "\n"
                + "Submitted by: " + sender.getFullName() + "\n"
                + "Email: " + sender.getEmail() + "\n"
                + "Warehouse: " + warehouse + "\n"
                + "Category: " + feedback.getCategory() + "\n\n"
                + "Message:\n" + feedback.getMessage() + "\n\n"
                + "Sign in to TechStock and open Feedback to respond.";
    }
}
