package vn.agent.controller.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class GoogleExchangeRequest {
    private String idToken;
    private String platform;
    private String deviceToken;
}
