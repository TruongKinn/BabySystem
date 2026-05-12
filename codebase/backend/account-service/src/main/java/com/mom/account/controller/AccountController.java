package com.mom.account.controller;

import com.mom.account.controller.dto.AddFamilyMemberRequest;
import com.mom.account.controller.dto.ApiResponse;
import com.mom.account.controller.dto.CreateFamilyRequest;
import com.mom.account.controller.dto.CreateUserRequest;
import com.mom.account.controller.dto.FamilyResponse;
import com.mom.account.controller.dto.UserResponse;
import com.mom.account.service.AccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @PostMapping("/users")
    public ApiResponse<UserResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        return ApiResponse.ok("User created", accountService.createUser(request));
    }

    @GetMapping("/users/{id}")
    public ApiResponse<UserResponse> getUser(@PathVariable("id") Long userId) {
        return ApiResponse.ok("Success", accountService.getUser(userId));
    }

    @PostMapping("/families")
    public ApiResponse<FamilyResponse> createFamily(@Valid @RequestBody CreateFamilyRequest request) {
        return ApiResponse.ok("Family created", accountService.createFamily(request));
    }

    @GetMapping("/families/{id}")
    public ApiResponse<FamilyResponse> getFamily(@PathVariable("id") Long familyId) {
        return ApiResponse.ok("Success", accountService.getFamily(familyId));
    }

    @PostMapping("/families/{id}/members")
    public ApiResponse<FamilyResponse> addFamilyMember(
            @PathVariable("id") Long familyId,
            @Valid @RequestBody AddFamilyMemberRequest request
    ) {
        return ApiResponse.ok("Family member added", accountService.addMember(familyId, request));
    }
}
