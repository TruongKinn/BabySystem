package vn.agent.controller;

import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import vn.agent.common.TokenType;
import vn.agent.exception.InvalidDataException;
import vn.agent.controller.request.TwoFactorRequest;
import vn.agent.controller.response.TwoFactorResponse;
import vn.agent.service.TwoFactorInstructionService;
import vn.agent.service.JwtService;
import vn.agent.service.TwoFactorService;

@RestController
@RequestMapping("/2fa")
@Slf4j
@Tag(name = "Two-Factor Authentication Controller")
@RequiredArgsConstructor
public class TwoFactorController {

    private final TwoFactorService twoFactorService;
    private final TwoFactorInstructionService instructionService;
    private final JwtService jwtService;

    @Operation(summary = "Get 2FA Instruction PDF", description = "Generate and return PDF instruction for 2FA setup")
    @GetMapping(value = "/instruction", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<InputStreamResource> getInstruction() {
        log.info("GET /2fa/instruction");
        var bis = instructionService.generateInstructionPdf();
        var headers = new HttpHeaders();
        headers.add("Content-Disposition", "inline; filename=2fa-instruction.pdf");

        return ResponseEntity
                .ok()
                .headers(headers)
                .contentType(MediaType.APPLICATION_PDF)
                .body(new InputStreamResource(bis));
    }

    @Operation(summary = "Get 2FA Status", description = "Check if two-factor authentication is enabled for user")
    @GetMapping("/status")
    public ResponseEntity<Boolean> getStatus(
            @RequestHeader(value = "userId", required = false) Long userId,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        userId = resolveUserId(userId, authorization);
        log.info("GET /2fa/status, userId: {}", userId);
        return ResponseEntity.ok(twoFactorService.is2faEnabled(userId));
    }

    @Operation(summary = "Generate 2FA Secret", description = "Generate secret and QR code for Google Authenticator")
    @PostMapping("/generate")
    public ResponseEntity<TwoFactorResponse> generateSecret(
            @RequestHeader(value = "userId", required = false) Long userId,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        userId = resolveUserId(userId, authorization);
        log.info("POST /2fa/generate, userId: {}", userId);

        TwoFactorResponse response = twoFactorService.generateSecret(userId);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Verify and Enable 2FA", description = "Verify OTP code and enable 2FA for user")
    @PostMapping("/verify")
    public ResponseEntity<String> verifyAndEnable(@RequestHeader(value = "userId", required = false) Long userId,
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody TwoFactorRequest request) {
        userId = resolveUserId(userId, authorization);
        log.info("POST /2fa/verify, userId: {}", userId);

        boolean isValid = twoFactorService.verifyAndEnable(userId, request.getOtp());

        if (isValid) {
            return ResponseEntity.ok("2FA enabled successfully");
        } else {
            return ResponseEntity.badRequest().body("Invalid OTP code");
        }
    }

    @Operation(summary = "Disable 2FA", description = "Disable two-factor authentication for user")
    @PostMapping("/disable")
    public ResponseEntity<String> disable(@RequestHeader(value = "userId", required = false) Long userId,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        userId = resolveUserId(userId, authorization);
        log.info("POST /2fa/disable, userId: {}", userId);

        twoFactorService.disable(userId);
        return ResponseEntity.ok("2FA disabled successfully");
    }

    private Long resolveUserId(Long userId, String authorization) {
        if (userId != null) {
            return userId;
        }

        if (authorization != null && authorization.startsWith("Bearer ")) {
            String token = authorization.substring(7);
            return jwtService.extractUserId(token, TokenType.ACCESS_TOKEN);
        }

        throw new InvalidDataException("Missing user identity for 2FA request");
    }
}
