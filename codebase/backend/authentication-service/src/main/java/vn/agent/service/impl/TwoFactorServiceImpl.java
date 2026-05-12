package vn.agent.service.impl;

import dev.samstevens.totp.code.*;
import dev.samstevens.totp.exceptions.QrGenerationException;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.qr.QrGenerator;
import dev.samstevens.totp.qr.ZxingPngQrGenerator;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.time.TimeProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.agent.controller.response.TwoFactorResponse;
import vn.agent.exception.InvalidDataException;
import vn.agent.model.User;
import vn.agent.repository.UserRepository;
import vn.agent.service.TwoFactorService;

import static dev.samstevens.totp.util.Utils.getDataUriForImage;

@Service
@Slf4j
@RequiredArgsConstructor
public class TwoFactorServiceImpl implements TwoFactorService {

    private final UserRepository userRepository;

    private static final String ISSUER = "MicroserviceApp";

    @Override
    @Transactional
    public TwoFactorResponse generateSecret(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidDataException("User not found"));

        // Generate secret (shortened to 16 characters for better compatibility)
        SecretGenerator secretGenerator = new DefaultSecretGenerator(16);
        String secret = secretGenerator.generate();

        // Save secret to user (but don't enable 2FA yet)
        user.setSecret(secret);
        userRepository.save(user);
        log.info("DEBUG OTP: Generated new secret for user {}: {}...{}", user.getUsername(), secret.substring(0, 3),
                secret.substring(secret.length() - 3));

        // Generate QR code
        QrData data = new QrData.Builder()
                .label(user.getUsername())
                .secret(secret)
                .issuer(ISSUER)
                .algorithm(HashingAlgorithm.SHA1)
                .digits(6)
                .period(30)
                .build();

        QrGenerator generator = new ZxingPngQrGenerator();
        String qrCodeUrl;
        try {
            log.info("DEBUG OTP: QR Data URI: {}", data.getUri());
            byte[] imageData = generator.generate(data);
            qrCodeUrl = getDataUriForImage(imageData, generator.getImageMimeType());
        } catch (QrGenerationException e) {
            log.error("Failed to generate QR code", e);
            throw new InvalidDataException("Failed to generate QR code");
        }

        return TwoFactorResponse.builder()
                .secret(secret)
                .qrCodeUrl(qrCodeUrl)
                .build();
    }

    @Override
    @Transactional
    public boolean verifyAndEnable(Long userId, String otp) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidDataException("User not found"));

        if (user.getSecret() == null) {
            throw new InvalidDataException("Please generate 2FA secret first");
        }

        // Verify OTP
        boolean isValid = verifyOtp(user, otp);

        if (isValid) {
            // Enable 2FA
            user.setTwoFactorEnabled(true);
            userRepository.save(user);
            log.info("2FA enabled for user: {}", user.getUsername());
        }

        return isValid;
    }

    @Override
    public boolean verifyOtp(User user, String otp) {
        if (user.getSecret() == null) {
            return false;
        }

        TimeProvider timeProvider = new SystemTimeProvider();
        CodeGenerator codeGenerator = new DefaultCodeGenerator();
        DefaultCodeVerifier verifier = new DefaultCodeVerifier(codeGenerator, timeProvider);
        verifier.setAllowedTimePeriodDiscrepancy(1); // Allow 30s drift

        String secret = user.getSecret().trim().toUpperCase();
        boolean isValid = verifier.isValidCode(secret, otp);

        log.info("TOTP verification for user {}: {} (Secret length: {})",
                user.getUsername(), isValid ? "SUCCESS" : "FAILED", secret.length());

        return isValid;
    }

    @Override
    public boolean is2faEnabled(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidDataException("User not found"));
        return user.isTwoFactorEnabled();
    }

    @Override
    @Transactional
    public void disable(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new InvalidDataException("User not found"));

        user.setTwoFactorEnabled(false);
        user.setSecret(null);
        userRepository.save(user);

        log.info("2FA disabled for user: {}", user.getUsername());
    }
}
