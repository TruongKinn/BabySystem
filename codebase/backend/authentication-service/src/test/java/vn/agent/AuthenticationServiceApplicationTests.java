package vn.agent;

import lombok.extern.slf4j.Slf4j;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.junit.jupiter.SpringExtension;
import vn.agent.controller.AuthenticationController;

@ExtendWith(SpringExtension.class)
@SpringBootTest(properties = {
        "grpc.server.port=0"
})
class AuthenticationServiceApplicationTests {

    @Autowired
    private AuthenticationController authenticationController;

    @Test
    void contextLoads() {
        Assertions.assertThat(authenticationController).isNotNull();
    }
}
