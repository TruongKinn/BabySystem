package vn.agent.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AccountCredentialMailService {

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${app.mail.enabled:true}")
    private boolean mailEnabled;

    @Value("${app.mail.from:no-reply@babysystem.local}")
    private String mailFrom;

    public void sendCredentialMail(String email, String displayName, String username, String rawPassword) {
        if (!mailEnabled || StringUtils.isBlank(email)) {
            return;
        }

        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            log.warn("Mail sender is not available. Skip credential email for user={}", username);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(email.trim());
        message.setSubject("[BabySystem] Thong tin tai khoan dang nhap");
        message.setText(buildMailBody(displayName, username, rawPassword));

        try {
            sender.send(message);
        } catch (Exception ex) {
            log.error("Failed to send credential email for user={}", username, ex);
        }
    }

    public void sendForgotPasswordMail(String email, String displayName, String username, String tempPassword) {
        if (!mailEnabled || StringUtils.isBlank(email)) {
            return;
        }

        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            log.warn("Mail sender is not available. Skip forgot password email for user={}", username);
            return;
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(email.trim());
        message.setSubject("[BabySystem] Khoi phuc mat khau dang nhap");
        message.setText(buildForgotPasswordMailBody(displayName, username, tempPassword));

        try {
            sender.send(message);
        } catch (Exception ex) {
            log.error("Failed to send forgot password email for user={}", username, ex);
        }
    }

    private String buildForgotPasswordMailBody(String displayName, String username, String tempPassword) {
        String name = StringUtils.defaultIfBlank(displayName, "ban");
        return String.format(
                "Xin chao %s,%n%n" +
                        "Mat khau cua ban tren BabySystem da duoc khoi phuc theo yeu cau.%n" +
                        "Username: %s%n" +
                        "Mat khau tam thoi moi: %s%n%n" +
                        "Vui long dang nhap lai bang mat khau tam thoi nay va cap nhat mat khau moi cua ban.%n%n" +
                        "Day la email tu dong, vui long khong tra loi thu nay.%n",
                name,
                username,
                tempPassword
        );
    }

    private String buildMailBody(String displayName, String username, String rawPassword) {
        String name = StringUtils.defaultIfBlank(displayName, "ban");
        return String.format(
                "Xin chao %s,%n%n" +
                        "Tai khoan gia dinh cua ban da duoc tao tren BabySystem.%n" +
                        "Username: %s%n" +
                        "Mat khau tam thoi: %s%n%n" +
                        "Vui long dang nhap va doi mat khau ngay sau lan dang nhap dau tien.%n%n" +
                        "Truong hop ban khong yeu cau tao tai khoan, vui long lien he quan tri vien.%n",
                name,
                username,
                rawPassword
        );
    }
}

