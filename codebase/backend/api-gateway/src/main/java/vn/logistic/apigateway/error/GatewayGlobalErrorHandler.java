package vn.logistic.apigateway.error;

import io.netty.handler.timeout.ReadTimeoutException;
import io.netty.handler.timeout.WriteTimeoutException;
import org.springframework.boot.autoconfigure.web.WebProperties;
import org.springframework.boot.web.reactive.error.ErrorAttributes;
import org.springframework.boot.autoconfigure.web.reactive.error.AbstractErrorWebExceptionHandler;
import org.springframework.context.ApplicationContext;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerCodecConfigurer;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.server.RequestPredicates;
import org.springframework.web.reactive.function.server.RouterFunction;
import org.springframework.web.reactive.function.server.RouterFunctions;
import org.springframework.web.reactive.function.server.ServerRequest;
import org.springframework.web.reactive.function.server.ServerResponse;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

import java.util.Map;
import java.util.concurrent.TimeoutException;

@Component
@Order(-2)
public class GatewayGlobalErrorHandler extends AbstractErrorWebExceptionHandler {

    private final GatewayErrorResponseFactory errorResponseFactory;

    public GatewayGlobalErrorHandler(
            ErrorAttributes errorAttributes,
            ApplicationContext applicationContext,
            ServerCodecConfigurer serverCodecConfigurer,
            GatewayErrorResponseFactory errorResponseFactory) {
        super(errorAttributes, new WebProperties.Resources(), applicationContext);
        this.errorResponseFactory = errorResponseFactory;
        setMessageWriters(serverCodecConfigurer.getWriters());
        setMessageReaders(serverCodecConfigurer.getReaders());
    }

    @Override
    protected RouterFunction<ServerResponse> getRoutingFunction(ErrorAttributes errorAttributes) {
        return RouterFunctions.route(RequestPredicates.all(), this::renderErrorResponse);
    }

    private Mono<ServerResponse> renderErrorResponse(ServerRequest request) {
        Throwable error = getError(request);
        HttpStatus status = resolveStatus(error);
        String message = resolveMessage(error, status);
        Map<String, Object> body = errorResponseFactory.build(
                status,
                message,
                request.path(),
                request.exchange().getRequest().getId(),
                null);

        return ServerResponse.status(status)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body);
    }

    private HttpStatus resolveStatus(Throwable error) {
        if (error instanceof ResponseStatusException responseStatusException) {
            HttpStatus status = HttpStatus.resolve(responseStatusException.getStatusCode().value());
            if (status != null) {
                return status;
            }
        }
        if (error instanceof TimeoutException
                || error instanceof ReadTimeoutException
                || error instanceof WriteTimeoutException
                || error.getClass().getSimpleName().contains("Timeout")) {
            return HttpStatus.GATEWAY_TIMEOUT;
        }
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }

    private String resolveMessage(Throwable error, HttpStatus status) {
        if (status == HttpStatus.SERVICE_UNAVAILABLE) {
            return "Downstream service is temporarily unavailable";
        }
        if (status == HttpStatus.GATEWAY_TIMEOUT) {
            return "Gateway timed out while waiting for downstream response";
        }
        if (error.getMessage() != null && !error.getMessage().isBlank()) {
            return error.getMessage();
        }
        return "Gateway request failed";
    }
}
