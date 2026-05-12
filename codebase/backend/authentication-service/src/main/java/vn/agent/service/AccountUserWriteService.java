package vn.agent.service;

import vn.agent.controller.request.ChangePasswordRequest;
import vn.agent.controller.request.CreateUserRequest;
import vn.agent.controller.request.UpdateUserRequest;
import vn.agent.common.UserStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface AccountUserWriteService {

    Long createUser(CreateUserRequest request);

    void updateUser(UpdateUserRequest request);

    void deleteUser(Long userId);

    void changePassword(ChangePasswordRequest request);

    void updateUserStatus(Long userId, UserStatus status);

    void resetPasswordByAdmin(Long userId, String temporaryPassword);

    String uploadAvatar(Long userId, MultipartFile file);

    ResponseEntity<Resource> getAvatar(Long userId);
}
