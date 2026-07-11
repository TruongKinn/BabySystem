package vn.agent.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.agent.controller.request.IpBlacklistRequest;
import vn.agent.controller.response.IpBlacklistResponse;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/admin/ip-blacklist")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "IP Blacklist Admin Controller")
public class IpBlacklistController {

    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    private static final String REDIS_PREFIX = "blacklist:ip:";

    @Data
    @AllArgsConstructor
    public static class ApiResponse<T> {
        private boolean success;
        private String message;
        private T data;
    }

    @PostMapping
    @Operation(summary = "Block an IP address")
    public ResponseEntity<ApiResponse<Void>> blockIp(@Valid @RequestBody IpBlacklistRequest request) {
        String ip = request.getIp().trim();
        String redisKey = REDIS_PREFIX + ip;
        
        Instant blockedAt = Instant.now();
        Instant expiryTime = null;
        if (request.getDurationSeconds() > 0) {
            expiryTime = blockedAt.plusSeconds(request.getDurationSeconds());
        }

        Map<String, Object> metadata = new HashMap<>();
        metadata.put("ip", ip);
        metadata.put("reason", request.getReason() == null ? "Blocked by admin" : request.getReason());
        metadata.put("blockedAt", blockedAt.toString());
        metadata.put("expiryTime", expiryTime != null ? expiryTime.toString() : null);

        try {
            String jsonVal = objectMapper.writeValueAsString(metadata);
            if (request.getDurationSeconds() > 0) {
                stringRedisTemplate.opsForValue().set(redisKey, jsonVal, request.getDurationSeconds(), TimeUnit.SECONDS);
                log.info("[IP Blacklist] Blocked IP {} for {} seconds", ip, request.getDurationSeconds());
            } else {
                stringRedisTemplate.opsForValue().set(redisKey, jsonVal);
                log.info("[IP Blacklist] Blocked IP {} permanently", ip);
            }
            return ResponseEntity.ok(new ApiResponse<>(true, "IP blocked successfully", null));
        } catch (Exception e) {
            log.error("[IP Blacklist] Error writing JSON value to Redis for IP {}", ip, e);
            return ResponseEntity.internalServerError().body(new ApiResponse<>(false, "Error saving block info", null));
        }
    }

    @DeleteMapping("/{ip}")
    @Operation(summary = "Unblock an IP address")
    public ResponseEntity<ApiResponse<Void>> unblockIp(@PathVariable String ip) {
        String redisKey = REDIS_PREFIX + ip.trim();
        Boolean deleted = stringRedisTemplate.delete(redisKey);
        
        if (Boolean.TRUE.equals(deleted)) {
            log.info("[IP Blacklist] Unblocked IP {}", ip);
            return ResponseEntity.ok(new ApiResponse<>(true, "IP unblocked successfully", null));
        } else {
            log.warn("[IP Blacklist] Attempted to unblock non-existing IP key {}", ip);
            return ResponseEntity.ok(new ApiResponse<>(true, "IP was not blocked", null));
        }
    }

    @GetMapping
    @Operation(summary = "Get all blocked IP addresses")
    public ResponseEntity<ApiResponse<List<IpBlacklistResponse>>> getBlockedIps() {
        Set<String> keys = stringRedisTemplate.keys(REDIS_PREFIX + "*");
        if (keys == null || keys.isEmpty()) {
            return ResponseEntity.ok(new ApiResponse<>(true, "Success", Collections.emptyList()));
        }

        List<IpBlacklistResponse> resultList = new ArrayList<>();
        for (String key : keys) {
            String jsonVal = stringRedisTemplate.opsForValue().get(key);
            if (jsonVal == null) continue;

            try {
                Map<String, Object> metadata = objectMapper.readValue(jsonVal, Map.class);
                String ip = (String) metadata.get("ip");
                String reason = (String) metadata.get("reason");
                String blockedAt = (String) metadata.get("blockedAt");
                String expiryTime = (String) metadata.get("expiryTime");
                
                Long ttl = stringRedisTemplate.getExpire(key, TimeUnit.SECONDS);
                // -1 in Redis getExpire means no expire, translate to 0 for permanent
                long safeTtl = (ttl == null || ttl < 0) ? 0L : ttl;

                resultList.add(IpBlacklistResponse.builder()
                        .ip(ip)
                        .reason(reason)
                        .blockedAt(blockedAt)
                        .expiryTime(expiryTime)
                        .ttl(safeTtl)
                        .build());
            } catch (Exception e) {
                log.error("[IP Blacklist] Error reading JSON value from Redis for key {}", key, e);
            }
        }

        // Sort by blockedAt descending
        resultList.sort((a, b) -> b.getBlockedAt().compareTo(a.getBlockedAt()));

        return ResponseEntity.ok(new ApiResponse<>(true, "Success", resultList));
    }
}
