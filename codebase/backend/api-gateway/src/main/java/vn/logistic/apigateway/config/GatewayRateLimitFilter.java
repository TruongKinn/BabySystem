package vn.logistic.apigateway.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.cloud.gateway.filter.ratelimit.KeyResolver;
import org.springframework.cloud.gateway.filter.ratelimit.RedisRateLimiter;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.Map;

import static org.springframework.cloud.gateway.support.ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR;

@Component
@RequiredArgsConstructor
@Slf4j
public class GatewayRateLimitFilter implements GlobalFilter, Ordered {

    private final KeyResolver clientKeyResolver;
    private final RedisRateLimiter redisRateLimiter;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, org.springframework.cloud.gateway.filter.GatewayFilterChain chain) {
        if (HttpMethod.OPTIONS.equals(exchange.getRequest().getMethod())) {
            return chain.filter(exchange);
        }

        Route route = exchange.getAttribute(GATEWAY_ROUTE_ATTR);
        String routeId = route != null ? route.getId() : exchange.getRequest().getPath().value();

        return clientKeyResolver.resolve(exchange)
                .defaultIfEmpty("ip:unknown")
                .flatMap(key -> redisRateLimiter.isAllowed(routeId, key)
                        .flatMap(response -> {
                            response.getHeaders().forEach((header, value) -> exchange.getResponse().getHeaders().add(header, value));
                            if (response.isAllowed()) {
                                return chain.filter(exchange);
                            }
                            return writeTooManyRequestsResponse(exchange, key);
                        }));
    }

    private Mono<Void> writeTooManyRequestsResponse(ServerWebExchange exchange, String key) {
        exchange.getResponse().setStatusCode(HttpStatus.TOO_MANY_REQUESTS);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);

        String requestPath = exchange.getRequest().getPath().value();
        String requestId = exchange.getRequest().getId();
        String message = "Too many requests. Please retry later.";
        String responseBody = """
                {
                  "timestamp":"%s",
                  "status":429,
                  "error":"Too Many Requests",
                  "message":"%s",
                  "path":"%s",
                  "requestId":"%s",
                  "rateLimitKey":"%s"
                }
                """.formatted(
                OffsetDateTime.now(),
                escapeJson(message),
                escapeJson(requestPath),
                escapeJson(requestId),
                escapeJson(key));

        DataBuffer body = exchange.getResponse()
                .bufferFactory()
                .wrap(responseBody.getBytes(StandardCharsets.UTF_8));

        log.warn("Rate limit exceeded for key '{}' on path '{}'", key, requestPath);
        return exchange.getResponse().writeWith(Mono.just(body));
    }

    private String escapeJson(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }
}
