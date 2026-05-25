package vn.agent.controller.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.io.Serializable;

@Data
public class RegisterRequest implements Serializable {
    private static final long serialVersionUID = 1L;

    @NotBlank(message = "username must not be blank")
    @Size(min = 3, max = 50, message = "username must be between 3 and 50 characters")
    private String username;

    @NotBlank(message = "email must not be blank")
    @Email(message = "email must be valid")
    private String email;

    @NotBlank(message = "password must not be blank")
    @Size(min = 6, max = 100, message = "password must be at least 6 characters")
    private String password;

    @NotBlank(message = "firstName must not be blank")
    private String firstName;

    @NotBlank(message = "lastName must not be blank")
    private String lastName;

    private String phone;
}
