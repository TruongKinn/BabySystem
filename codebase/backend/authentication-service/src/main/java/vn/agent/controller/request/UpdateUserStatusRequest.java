package vn.agent.controller.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import vn.agent.common.UserStatus;

@Data
public class UpdateUserStatusRequest {

    @NotNull
    private UserStatus status;
}
