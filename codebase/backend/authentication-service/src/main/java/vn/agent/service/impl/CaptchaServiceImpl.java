package vn.agent.service.impl;

import cn.hutool.captcha.CaptchaUtil;
import cn.hutool.captcha.LineCaptcha;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import vn.agent.controller.response.CaptchaResponse;
import vn.agent.exception.UnauthorizedException;
import vn.agent.service.CaptchaService;

import java.time.Duration;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class CaptchaServiceImpl implements CaptchaService {

    private final StringRedisTemplate stringRedisTemplate;

    @Override
    public CaptchaResponse generateCaptcha() {
        // Create 150x50 captcha with 4 characters, 50 line interference elements
        LineCaptcha lineCaptcha = CaptchaUtil.createLineCaptcha(150, 50, 4, 50);
        String code = lineCaptcha.getCode();
        String base64 = lineCaptcha.getImageBase64Data();
        String token = UUID.randomUUID().toString();

        // Save to Redis with 5 minutes expiration
        stringRedisTemplate.opsForValue().set("login:captcha:" + token, code, Duration.ofMinutes(5));

        return CaptchaResponse.builder()
                .captchaToken(token)
                .base64Image(base64)
                .build();
    }

    @Override
    public void verifyCaptcha(String token, String answer) {
        if (token == null || token.isBlank() || answer == null || answer.isBlank()) {
            throw new UnauthorizedException("CAPTCHA is required");
        }
        String key = "login:captcha:" + token;
        String cachedCode = stringRedisTemplate.opsForValue().get(key);

        if (cachedCode == null) {
            throw new UnauthorizedException("CAPTCHA has expired or is invalid. Please get a new one.");
        }
        if (!cachedCode.equalsIgnoreCase(answer)) {
            throw new UnauthorizedException("Invalid CAPTCHA code. Please try again.");
        }

        // Delete once successfully verified
        stringRedisTemplate.delete(key);
    }
}
