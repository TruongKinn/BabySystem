package vn.agent.controller.response;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CaptchaResponse {
    private String captchaToken;
    private String base64Image;
}
