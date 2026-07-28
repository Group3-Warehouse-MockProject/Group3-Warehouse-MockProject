package com.fpt.sccw.service;

import com.fpt.sccw.entity.Feedback;
import com.fpt.sccw.entity.Role;
import com.fpt.sccw.entity.User;
import com.fpt.sccw.repository.UserRepository;
import java.util.LinkedHashSet;
import java.util.Set;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

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

        try {
            sendHtmlEmail(recipients.toArray(String[]::new), "[TechStock] New feedback #" + feedback.getId(),
                    buildSubmissionHtml(feedback));
            log.info("Feedback #{} notification sent to {} reviewer(s)", feedback.getId(), recipients.size());
        } catch (Exception exception) {
            log.error("Feedback #{} was saved, but its email notification failed", feedback.getId(), exception);
        }
    }

    @Async
    public void notifySubmitterOfResponse(Feedback feedback) {
        User submitter = feedback.getUser();
        if (senderAddress == null || senderAddress.isBlank()) {
            log.warn("Feedback #{} was answered, but email was skipped because MAIL_USERNAME is not configured", feedback.getId());
            return;
        }
        if (submitter.getEmail() == null || submitter.getEmail().isBlank()) {
            log.warn("Feedback #{} was answered, but the submitter has no email address", feedback.getId());
            return;
        }

        try {
            sendHtmlEmailTo(submitter.getEmail(),
                    "[TechStock] Your feedback #" + feedback.getId() + " has been answered",
                    buildResponseHtml(feedback));
            log.info("Feedback #{} response notification sent to {}", feedback.getId(), submitter.getEmail());
        } catch (Exception exception) {
            log.error("Feedback #{} was answered, but its submitter email notification failed", feedback.getId(), exception);
        }
    }

    private void sendHtmlEmail(String[] recipients, String subject, String html) throws Exception {
        MimeMessage email = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(email, false, "UTF-8");
        helper.setFrom(senderAddress);
        helper.setBcc(recipients);
        helper.setSubject(subject);
        helper.setText(html, true);
        mailSender.send(email);
    }

    private void sendHtmlEmailTo(String recipient, String subject, String html) throws Exception {
        MimeMessage email = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(email, false, "UTF-8");
        helper.setFrom(senderAddress);
        helper.setTo(recipient);
        helper.setSubject(subject);
        helper.setText(html, true);
        mailSender.send(email);
    }

    private String buildSubmissionHtml(Feedback feedback) {
        User sender = feedback.getUser();
        String warehouse = sender.getWarehouse() == null
                ? "Not assigned" : sender.getWarehouse().getWarehouseName();
        return emailLayout("New feedback needs a response", "A team member submitted feedback for your review.",
                "<table>"
                        + row("Feedback ID", String.valueOf(feedback.getId()))
                        + row("Submitted by", sender.getFullName())
                        + row("Email", sender.getEmail())
                        + row("Warehouse", warehouse)
                        + row("Category", feedback.getCategory())
                        + "</table>"
                        + section("Message", feedback.getMessage())
                        + footer("Sign in to TechStock and open Feedback to respond."));
    }

    private String buildResponseHtml(Feedback feedback) {
        String responder = feedback.getRespondedBy() == null
                ? "A TechStock reviewer" : feedback.getRespondedBy().getFullName();
        return emailLayout("Your feedback has been answered", "A reviewer has responded to your feedback.",
                "<table>"
                        + row("Feedback ID", String.valueOf(feedback.getId()))
                        + row("Category", feedback.getCategory())
                        + row("Responded by", responder)
                        + "</table>"
                        + section("Your feedback", feedback.getMessage())
                        + section("Response", feedback.getResponse())
                        + footer("Sign in to TechStock and open Feedback to view the response."));
    }

    private String emailLayout(String title, String intro, String content) {
        return "<html><body style=\"margin:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#172033\">"
                + "<div style=\"max-width:640px;margin:24px auto;background:#ffffff;border:1px solid #dce3ef\">"
                + "<div style=\"padding:24px;background:#0f766e;color:#ffffff\"><h1 style=\"margin:0;font-size:22px\">TechStock</h1>"
                + "<p style=\"margin:6px 0 0\">" + escape(title) + "</p></div>"
                + "<div style=\"padding:24px\"><p style=\"margin-top:0\">" + escape(intro) + "</p>" + content + "</div></div>"
                + "</body></html>";
    }

    private String row(String label, String value) {
        return "<tr><td style=\"padding:8px 12px;color:#5c677d;font-weight:bold\">" + escape(label)
                + "</td><td style=\"padding:8px 12px\">" + escape(value) + "</td></tr>";
    }

    private String section(String title, String value) {
        return "<h2 style=\"font-size:15px;margin:22px 0 8px\">" + escape(title) + "</h2>"
                + "<div style=\"padding:12px;background:#f5f7fb;white-space:pre-wrap\">" + escape(value) + "</div>";
    }

    private String footer(String text) {
        return "<p style=\"margin:24px 0 0;color:#5c677d;font-size:13px\">" + escape(text) + "</p>";
    }

    private String escape(String value) {
        return HtmlUtils.htmlEscape(value == null ? "" : value);
    }
}
