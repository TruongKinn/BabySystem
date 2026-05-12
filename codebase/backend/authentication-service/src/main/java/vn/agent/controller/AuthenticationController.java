package vn.agent.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.agent.controller.request.ForceChangePasswordRequest;
import vn.agent.controller.request.LoginRequest;
import vn.agent.controller.response.TokenResponse;
import vn.agent.service.AuthenticationService;

import static org.springframework.http.HttpStatus.OK;

@RestController
@Tag(name = "Authentication Controller")
public record AuthenticationController(AuthenticationService authenticationService) {

    @Operation(summary = "Access Token", description = "Generate access token")
    @PostMapping("/access-token")
    @ResponseStatus(OK)
    public ResponseEntity<TokenResponse> accessToken(@RequestBody LoginRequest request) {
        return new ResponseEntity<>(authenticationService.createAccessToken(request), OK);
    }

    @Operation(summary = "Refresh Token", description = "Generate refresh token")
    @PostMapping("/refresh-token")
    @ResponseStatus(OK)
    public ResponseEntity<TokenResponse> refreshToken(HttpServletRequest request) {
        return new ResponseEntity<>(authenticationService.createRefreshToken(request), OK);
    }

    @Operation(summary = "Exchange Keycloak Token", description = "Exchange Keycloak token for internal token")
    @PostMapping("/exchange-keycloak-token")
    @ResponseStatus(OK)
    public ResponseEntity<TokenResponse> exchangeKeycloakToken(
            @RequestBody vn.agent.controller.request.KeycloakExchangeRequest request) {
        return new ResponseEntity<>(authenticationService.exchangeKeycloakToken(request), OK);
    }

    @Operation(summary = "Force Change Password", description = "Change temporary password when login requires password change")
    @PostMapping("/force-change-password")
    @ResponseStatus(OK)
    public ResponseEntity<Void> forceChangePassword(@Valid @RequestBody ForceChangePasswordRequest request) {
        authenticationService.forceChangePassword(request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/test-cors")
    public ResponseEntity<TokenResponse> cors() {

        return new ResponseEntity<>(
                TokenResponse.builder().accessToken("ACCESSTOKEN").refreshToken("REFRESHTOKEN").build(), OK);
    }

    @GetMapping("/test-delay")
    public ResponseEntity<String> delay() throws InterruptedException {
        Thread.sleep(10000);
        return new ResponseEntity<>("Delayed !!!", OK);
    }
}
