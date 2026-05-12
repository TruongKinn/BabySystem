package vn.agent.service.grpc;

import io.grpc.stub.StreamObserver;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.security.SignatureException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.devh.boot.grpc.server.service.GrpcService;
import vn.agent.grpcserver.VerifyRequest;
import vn.agent.grpcserver.VerifyResponse;
import vn.agent.grpcserver.VerifyTokenServiceGrpc;
import vn.agent.service.JwtService;

import static vn.agent.common.TokenType.ACCESS_TOKEN;

@Slf4j
@GrpcService
@RequiredArgsConstructor
public class VerifyServiceImpl extends VerifyTokenServiceGrpc.VerifyTokenServiceImplBase {

    private final JwtService jwtService;

    @Override
    public void verifyAccessToken(VerifyRequest request, StreamObserver<VerifyResponse> responseObserver) {
        log.info("-----[ verifyToken ]-----");
        VerifyResponse response;
        try {
            Long userId = jwtService.extractUserId(request.getToken(), ACCESS_TOKEN);
            response = VerifyResponse.newBuilder()
                    .setIsVerified(true)
                    .setMessage("Token is valid")
                    .setUserId(userId)
                    .build();
        } catch (IllegalArgumentException e) {
            response = VerifyResponse.newBuilder().setIsVerified(false).setMessage(e.getMessage()).build();
        } catch (ExpiredJwtException | SignatureException ex) {
            response = VerifyResponse.newBuilder().setIsVerified(false).setMessage(ex.getMessage()).build();
        }

        responseObserver.onNext(response);
        responseObserver.onCompleted();
    }
}
