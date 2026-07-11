package vn.logistic.apigateway.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
@Slf4j
public class IpBlockFilter implements GlobalFilter, Ordered {

    private final ReactiveStringRedisTemplate reactiveStringRedisTemplate;

    private static final String REDIS_PREFIX = "blacklist:ip:";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String clientIp = getClientIp(exchange);
        
        // Skip checking if IP is not resolved
        if ("unknown".equalsIgnoreCase(clientIp)) {
            return chain.filter(exchange);
        }

        String redisKey = REDIS_PREFIX + clientIp;
        return reactiveStringRedisTemplate.hasKey(redisKey)
                .flatMap(hasKey -> {
                    if (Boolean.TRUE.equals(hasKey)) {
                        log.warn("[Security] Request rejected. IP {} is blocked in Redis blacklist.", clientIp);
                        return writeBlockedResponse(exchange, clientIp);
                    }
                    return chain.filter(exchange);
                });
    }

    private String getClientIp(ServerWebExchange exchange) {
        // 1. Check X-Forwarded-For header for proxies/load-balancers
        String xff = exchange.getRequest().getHeaders().getFirst("X-Forwarded-For");
        if (StringUtils.hasText(xff)) {
            return xff.split(",")[0].trim();
        }
        // 2. Fallback to Remote Address
        if (exchange.getRequest().getRemoteAddress() != null) {
            return exchange.getRequest().getRemoteAddress().getAddress().getHostAddress();
        }
        return "unknown";
    }

    private Mono<Void> writeBlockedResponse(ServerWebExchange exchange, String ip) {
        exchange.getResponse().setStatusCode(HttpStatus.FORBIDDEN);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);
        
        String jsonBody = String.format(
                "{\"success\":false,\"message\":\"Access Denied: Your IP [%s] is blocked by administrator due to security policies.\"}",
                ip
        );
        
        DataBuffer buffer = exchange.getResponse().bufferFactory()
                .wrap(jsonBody.getBytes(StandardCharsets.UTF_8));
        return exchange.getResponse().writeWith(Mono.just(buffer));
    }

    @Override
    public int getOrder() {
        // Run BEFORE ApiPermissionFilter (which is Ordered.HIGHEST_PRECEDENCE + 5)
        return Ordered.HIGHEST_PRECEDENCE;
    }
}
