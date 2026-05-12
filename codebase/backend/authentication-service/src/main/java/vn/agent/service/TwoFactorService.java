package vn.agent.service;

import vn.agent.controller.response.TwoFactorResponse;
import vn.agent.model.User;

public interface TwoFactorService {

    /**
     * Generate 2FA secret and QR code for user
     * 
     * @param userId User ID
     * @return TwoFactorResponse containing secret and QR code URL
     */
    TwoFactorResponse generateSecret(Long userId);

    /**
     * Verify OTP code and enable 2FA for user
     * 
     * @param userId User ID
     * @param otp    OTP code from authenticator app
     * @return true if verification successful
     */
    boolean verifyAndEnable(Long userId, String otp);

    /**
     * Verify OTP code during login
     * 
     * @param user User entity
     * @param otp  OTP code from authenticator app
     * @return true if verification successful
     */
    boolean verifyOtp(User user, String otp);

    /**
     * Check if 2FA is enabled for user
     * 
     * @param userId User ID
     * @return true if 2FA enabled
     */
    boolean is2faEnabled(Long userId);

    /**
     * Disable 2FA for user
     * 
     * @param userId User ID
     */
    void disable(Long userId);
}
