package vn.logistic.apigateway.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ServerWebExchange;
import vn.logistic.apigateway.error.GatewayErrorResponseFactory;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class GatewayFallbackController {

    private final GatewayErrorResponseFactory errorResponseFactory;

    @RequestMapping("/gateway/fallback/{service}")
    public ResponseEntity<Map<String, Object>> fallback(@PathVariable String service, ServerWebExchange exchange) {
        Throwable cause = exchange.getAttribute(ServerWebExchangeUtils.CIRCUITBREAKER_EXECUTION_EXCEPTION_ATTR);
        Map<String, Object> response = errorResponseFactory.build(
                HttpStatus.SERVICE_UNAVAILABLE,
                cause != null && cause.getMessage() != null
                        ? cause.getMessage()
                        : "Downstream service is temporarily unavailable",
                exchange.getRequest().getPath().value(),
                exchange.getRequest().getId(),
                service);

        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(response);
    }
}
