package vn.agent.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.core.io.Resource;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import vn.agent.common.UserType;
import vn.agent.controller.request.ChangePasswordRequest;
import vn.agent.controller.request.CreateUserRequest;
import vn.agent.controller.request.UpdateUserRequest;
import vn.agent.controller.response.PageResponse;
import vn.agent.controller.response.UserResponse;
import vn.agent.model.User;
import vn.agent.repository.UserRepository;
import vn.agent.service.AccountUserWriteService;

import java.util.List;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@RestController
@RequestMapping("/account/user")
@RequiredArgsConstructor
@Tag(name = "Account User Controller")
public class AccountUserController {

    private final UserRepository userRepository;
    private final AccountUserWriteService accountUserWriteService;

    @GetMapping("/{id}")
    @Operation(summary = "Get one user by id")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found: " + id));
        return ResponseEntity.ok(toResponse(user));
    }

    @GetMapping("/list")
    @Operation(summary = "Get user list")
    public ResponseEntity<PageResponse<UserResponse>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) List<String> search) {

        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1), parseSort(sort));
        Page<User> result = userRepository.findAll(pageable);

        List<UserResponse> items = result.getContent().stream().map(this::toResponse).toList();
        PageResponse<UserResponse> response = PageResponse.<UserResponse>builder()
                .page(result.getNumber())
                .size(result.getSize())
                .total(result.getTotalElements())
                .items(items)
                .build();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/add")
    @Operation(summary = "Create user")
    public ResponseEntity<Long> addUser(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.ok(accountUserWriteService.createUser(request));
    }

    @PutMapping("/upd")
    @Operation(summary = "Update user")
    public ResponseEntity<Void> updateUser(@Valid @RequestBody UpdateUserRequest request) {
        accountUserWriteService.updateUser(request);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/del/{id}")
    @Operation(summary = "Delete user")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        accountUserWriteService.deleteUser(id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/change-pwd")
    @Operation(summary = "Change user password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        accountUserWriteService.changePassword(request);
        return ResponseEntity.ok().build();
    }

    @PostMapping(value = "/{id}/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload user avatar")
    public ResponseEntity<String> uploadAvatar(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(accountUserWriteService.uploadAvatar(id, file));
    }

    @GetMapping("/avatar/{id}")
    @Operation(summary = "Get user avatar")
    public ResponseEntity<Resource> getAvatar(@PathVariable Long id) {
        return accountUserWriteService.getAvatar(id);
    }

    private Sort parseSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return Sort.by(Sort.Direction.ASC, "id");
        }

        String normalized = sort.trim();
        String[] parts = normalized.contains(",") ? normalized.split(",", 2) : normalized.split(":", 2);
        String field = parts.length > 0 && !parts[0].isBlank() ? parts[0].trim() : "id";
        String direction = parts.length > 1 ? parts[1].trim() : "asc";
        return "desc".equalsIgnoreCase(direction)
                ? Sort.by(Sort.Direction.DESC, field)
                : Sort.by(Sort.Direction.ASC, field);
    }

    private UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .dateOfBirth(user.getDateOfBirth())
                .gender(user.getGender())
                .phone(user.getPhone())
                .email(user.getEmail())
                .username(user.getUsername())
                .type(resolveDisplayType(user))
                .status(user.getStatus())
                .avatarUrl(resolveAvatarUrl(user))
                .build();
    }

    private String resolveAvatarUrl(User user) {
        return user.getAvatarUrl() == null || user.getAvatarUrl().isBlank()
                ? null
                : "/account/user/avatar/" + user.getId();
    }

    private UserType resolveDisplayType(User user) {
        if (user.getRoles() != null && user.getRoles().stream().anyMatch(item ->
                item.getRole() != null && "OWNER".equalsIgnoreCase(item.getRole().getName()))) {
            return UserType.OWNER;
        }
        if (user.getRoles() != null && user.getRoles().stream().anyMatch(item ->
                item.getRole() != null && "ADMIN".equalsIgnoreCase(item.getRole().getName()))) {
            return UserType.ADMIN;
        }
        return user.getType() == null ? UserType.USER : user.getType();
    }
}
