package com.fpt.sccw.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendTemporaryPassword(String toEmail, String username, String tempPassword) {
        try {
            jakarta.mail.internet.MimeMessage mimeMessage = mailSender.createMimeMessage();
            org.springframework.mail.javamail.MimeMessageHelper helper = new org.springframework.mail.javamail.MimeMessageHelper(mimeMessage, "utf-8");
            
            helper.setTo(toEmail);
            helper.setSubject("Welcome to TechStock - Account Setup Required");
            
            String htmlMsg = "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                "<style>" +
                "body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }" +
                ".container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }" +
                ".header { background: linear-gradient(135deg, #0ea5e9, #2563eb); padding: 30px 40px; text-align: center; color: white; }" +
                ".header h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px; }" +
                ".content { padding: 40px; color: #3f3f46; line-height: 1.6; }" +
                ".content p { margin: 0 0 16px 0; font-size: 16px; }" +
                ".password-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }" +
                ".password-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 8px; font-weight: 600; }" +
                ".password-value { font-family: 'Courier New', Courier, monospace; font-size: 28px; font-weight: bold; color: #0f172a; letter-spacing: 2px; }" +
                ".btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin-top: 10px; font-size: 16px; }" +
                ".footer { background: #f8fafc; padding: 24px 40px; text-align: center; font-size: 13px; color: #64748b; border-top: 1px solid #f1f5f9; }" +
                ".footer p { margin: 0 0 8px 0; }" +
                "</style>" +
                "</head>" +
                "<body>" +
                "<div class='container'>" +
                "<div class='header'>" +
                "<h1>Welcome to TechStock</h1>" +
                "</div>" +
                "<div class='content'>" +
                "<p>Hi <strong>" + username + "</strong>,</p>" +
                "<p>Your account has been successfully created. To ensure the security of our platform, we have generated a temporary password for your first login.</p>" +
                "<div class='password-box'>" +
                "<div class='password-label'>Your Temporary Password</div>" +
                "<div class='password-value'>" + tempPassword + "</div>" +
                "</div>" +
                "<p>Please log in to the system and you will be prompted to set a new, secure password and review our access policies.</p>" +
                "<div style='text-align: center; margin-top: 32px;'>" +
                "<a href='http://localhost:5173/login' class='btn'>Log In Now</a>" +
                "</div>" +
                "</div>" +
                "<div class='footer'>" +
                "<p>&copy; " + java.time.Year.now().getValue() + " TechStock - Smart Computer Warehouse.</p>" +
                "<p>If you did not request this account, please contact your system administrator.</p>" +
                "</div>" +
                "</div>" +
                "</body>" +
                "</html>";
            
            helper.setText(htmlMsg, true);
            mailSender.send(mimeMessage);
            log.info("Temporary password email sent to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send email to {}. If you haven't configured mail properties, the temporary password is: {}", toEmail, tempPassword);
        }
    }
}
