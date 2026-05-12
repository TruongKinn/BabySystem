package vn.agent.service;

import vn.agent.controller.response.CaptchaResponse;

public interface CaptchaService {
    CaptchaResponse generateCaptcha();

    void verifyCaptcha(String token, String answer);
}
