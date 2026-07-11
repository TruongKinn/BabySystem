package vn.agent.controller.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class IpBlacklistRequest {
    @NotBlank(message = "IP address is required")
    private String ip;
    
    private String reason;
    
    private long durationSeconds; // 0 means permanent
}
