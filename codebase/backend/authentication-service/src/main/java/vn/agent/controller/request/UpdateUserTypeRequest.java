package vn.agent.controller.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import vn.agent.common.UserType;

@Data
public class UpdateUserTypeRequest {

    @NotNull
    private UserType type;
}
