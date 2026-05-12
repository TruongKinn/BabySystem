package vn.agent.controller.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

import java.io.Serializable;

@Getter
public class TwoFactorRequest implements Serializable {

    @NotBlank(message = "OTP must be not blank")
    private String otp;
}
