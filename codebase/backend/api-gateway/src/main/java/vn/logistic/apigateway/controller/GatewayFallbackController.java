package vn.logistic.apigateway.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import vn.logistic.apigateway.error.GatewayErrorResponseFactory;

import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class GatewayFallbackController {

    private final GatewayErrorResponseFactory errorResponseFactory;
    private final ObjectMapper objectMapper;

    @RequestMapping("/gateway/fallback/{service}")
    public Mono<Void> fallback(@PathVariable String service, ServerWebExchange exchange) {
        Throwable cause = exchange.getAttribute(ServerWebExchangeUtils.CIRCUITBREAKER_EXECUTION_EXCEPTION_ATTR);
        Map<String, Object> body = errorResponseFactory.build(
                HttpStatus.SERVICE_UNAVAILABLE,
                cause != null && cause.getMessage() != null
                        ? cause.getMessage()
                        : "Downstream service is temporarily unavailable",
                exchange.getRequest().getPath().value(),
                exchange.getRequest().getId(),
                service);

        String jsonBody;
        try {
            jsonBody = objectMapper.writeValueAsString(body);
        } catch (JsonProcessingException e) {
            jsonBody = "{\"status\":503,\"message\":\"Downstream service is temporarily unavailable\"}";
        }

        exchange.getResponse().setStatusCode(HttpStatus.SERVICE_UNAVAILABLE);
        exchange.getResponse().getHeaders().setContentType(MediaType.APPLICATION_JSON);

        DataBuffer buffer = exchange.getResponse().bufferFactory()
                .wrap(jsonBody.getBytes(StandardCharsets.UTF_8));
        return exchange.getResponse().writeWith(Mono.just(buffer));
    }
}
