package vn.agent.controller.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IpBlacklistResponse {
    private String ip;
    private String reason;
    private String blockedAt;
    private String expiryTime;
    private long ttl; // Remaining time in seconds
}
