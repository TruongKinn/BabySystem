package vn.agent.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.agent.controller.request.ResetPasswordByAdminRequest;
import vn.agent.controller.request.UpdateUserStatusRequest;
import vn.agent.service.AccountUserWriteService;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@Tag(name = "User Admin Controller")
public class UserAdminController {

    private final AccountUserWriteService accountUserWriteService;

    @PatchMapping("/{id}/status")
    @Operation(summary = "Update user status")
    public ResponseEntity<Void> updateUserStatus(@PathVariable Long id,
                                                 @Valid @RequestBody UpdateUserStatusRequest request) {
        accountUserWriteService.updateUserStatus(id, request.getStatus());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/reset-password")
    @Operation(summary = "Reset user password by admin")
    public ResponseEntity<Void> resetPasswordByAdmin(@PathVariable Long id,
                                                     @Valid @RequestBody ResetPasswordByAdminRequest request) {
        accountUserWriteService.resetPasswordByAdmin(id, request.getTemporaryPassword());
        return ResponseEntity.ok().build();
    }
}
