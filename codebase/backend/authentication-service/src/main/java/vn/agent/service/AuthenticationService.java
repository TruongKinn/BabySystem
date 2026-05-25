package vn.agent.service;

import jakarta.servlet.http.HttpServletRequest;
import vn.agent.controller.request.ForceChangePasswordRequest;
import vn.agent.controller.request.GithubExchangeRequest;
import vn.agent.controller.request.GoogleExchangeRequest;
import vn.agent.controller.request.KeycloakExchangeRequest;
import vn.agent.controller.request.LoginRequest;
import vn.agent.controller.response.TokenResponse;

public interface AuthenticationService {

    TokenResponse createAccessToken(LoginRequest request);

    TokenResponse createRefreshToken(HttpServletRequest request);

    TokenResponse exchangeKeycloakToken(KeycloakExchangeRequest request);

    void forceChangePassword(ForceChangePasswordRequest request);

    TokenResponse exchangeGoogleToken(GoogleExchangeRequest request);

    TokenResponse exchangeGithubToken(GithubExchangeRequest request);
}
