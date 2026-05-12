package vn.agent.controller.response;

import lombok.Builder;
import lombok.Getter;

import java.io.Serializable;

@Getter
@Builder
public class TwoFactorResponse implements Serializable {
    private String secret;
    private String qrCodeUrl;
}
