package vn.logistic.apigateway.error;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class GatewayErrorResponseFactory {

    public Map<String, Object> build(HttpStatus status, String message, String path, String requestId, String service) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("timestamp", OffsetDateTime.now());
        response.put("status", status.value());
        response.put("error", status.getReasonPhrase());
        response.put("message", message);
        response.put("path", path);
        response.put("requestId", requestId);
        if (service != null && !service.isBlank()) {
            response.put("service", service);
        }
        return response;
    }
}
