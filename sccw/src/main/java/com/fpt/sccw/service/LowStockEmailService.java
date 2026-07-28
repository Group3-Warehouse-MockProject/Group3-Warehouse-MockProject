package com.fpt.sccw.service;

import com.fpt.sccw.entity.Inventory;
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
public class LowStockEmailService {

    private final JavaMailSender mailSender;
    private final UserRepository userRepository;

    @Value("${spring.mail.username:}")
    private String senderAddress;

    @Async
    public void notifyWarehouseTeam(Inventory inventory, long threshold) {
        if (senderAddress == null || senderAddress.isBlank()) {
            log.warn("Low-stock email for inventory #{} skipped because MAIL_USERNAME is not configured", inventory.getId());
            return;
        }

        Set<String> recipients = new LinkedHashSet<>();
        Long warehouseId = inventory.getWarehouse().getId();
        for (User user : userRepository.findByWarehouseId(warehouseId)) {
            if (Boolean.TRUE.equals(user.getIsDeleted()) || user.getEmail() == null || user.getEmail().isBlank()
                    || user.getRole() == null) {
                continue;
            }
            Role.RoleName role = user.getRole().getRoleName();
            if (role == Role.RoleName.WAREHOUSE_MANAGER || role == Role.RoleName.STAFF) {
                recipients.add(user.getEmail().trim());
            }
        }

        if (recipients.isEmpty()) {
            log.warn("Low-stock email for inventory #{} skipped because no warehouse manager or staff email was found", inventory.getId());
            return;
        }

        try {
            sendHtmlEmail(recipients.toArray(String[]::new),
                    "[TechStock] Low stock alert - " + inventory.getProduct().getCode(),
                    buildHtml(inventory, threshold));
            log.info("Low-stock email for {} sent to {} warehouse team member(s)",
                    inventory.getProduct().getCode(), recipients.size());
        } catch (Exception exception) {
            log.error("Low-stock email for inventory #{} failed", inventory.getId(), exception);
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

    private String buildHtml(Inventory inventory, long threshold) {
        String productName = escape(inventory.getProduct().getName());
        String productCode = escape(inventory.getProduct().getCode());
        String warehouseName = escape(inventory.getWarehouse().getWarehouseName());
        String warehouseCode = escape(inventory.getWarehouse().getCode());
        return "<html><body style=\"margin:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#172033\">"
                + "<div style=\"max-width:640px;margin:24px auto;background:#ffffff;border:1px solid #dce3ef\">"
                + "<div style=\"padding:24px;background:#b42318;color:#ffffff\"><h1 style=\"margin:0;font-size:22px\">TechStock</h1>"
                + "<p style=\"margin:6px 0 0\">Low stock alert</p></div>"
                + "<div style=\"padding:24px\"><p style=\"margin-top:0\">A product needs replenishment.</p>"
                + "<table><tr><td style=\"padding:8px 12px;color:#5c677d;font-weight:bold\">Product</td><td style=\"padding:8px 12px\">"
                + productName + " (" + productCode + ")</td></tr>"
                + "<tr><td style=\"padding:8px 12px;color:#5c677d;font-weight:bold\">Warehouse</td><td style=\"padding:8px 12px\">"
                + warehouseName + " (" + warehouseCode + ")</td></tr>"
                + "<tr><td style=\"padding:8px 12px;color:#5c677d;font-weight:bold\">Current quantity</td><td style=\"padding:8px 12px\">"
                + inventory.getQuantity() + "</td></tr>"
                + "<tr><td style=\"padding:8px 12px;color:#5c677d;font-weight:bold\">Threshold</td><td style=\"padding:8px 12px\">"
                + threshold + "</td></tr></table>"
                + "<p style=\"margin:24px 0 0;color:#5c677d;font-size:13px\">Please review the inventory and create or approve a replenishment receipt if needed.</p>"
                + "</div></div></body></html>";
    }

    private String escape(String value) {
        return HtmlUtils.htmlEscape(value == null ? "" : value);
    }
}
