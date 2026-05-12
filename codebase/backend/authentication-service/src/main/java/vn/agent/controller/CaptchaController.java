package vn.agent.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.agent.controller.response.CaptchaResponse;
import vn.agent.service.CaptchaService;

import static org.springframework.http.HttpStatus.OK;

@RestController
@Slf4j
@RequiredArgsConstructor
@RequestMapping("/captcha")
@Tag(name = "Captcha Controller")
public class CaptchaController {

    private final CaptchaService captchaService;

    @Operation(summary = "Generate Login CAPTCHA", description = "Return base64 image and a CAPTCHA token")
    @GetMapping
    public ResponseEntity<CaptchaResponse> getCaptcha() {
        log.info("GET /captcha");
        return new ResponseEntity<>(captchaService.generateCaptcha(), OK);
    }
}
