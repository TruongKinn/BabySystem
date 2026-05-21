package com.mom.account.controller;

import com.mom.account.controller.dto.AddFamilyMemberRequest;
import com.mom.account.controller.dto.CreateFamilyRequest;
import com.mom.account.controller.dto.CreateUserRequest;
import com.mom.account.controller.dto.FamilyFeatureAuditLogResponse;
import com.mom.account.controller.dto.FamilyFeatureEntitlementResponse;
import com.mom.account.controller.dto.FamilyResponse;
import com.mom.account.controller.dto.InviteFamilyMemberRequest;
import com.mom.account.controller.dto.PremiumFeatureResponse;
import com.mom.account.controller.dto.ResolvedFeatureAccessResponse;
import com.mom.account.controller.dto.UpdateFamilyEntitlementsRequest;
import com.mom.account.controller.dto.UpcomingBirthdayResponse;
import com.mom.account.controller.dto.UpdateFamilyRequest;
import com.mom.account.controller.dto.UpdatePreferencesRequest;
import com.mom.account.controller.dto.UserResponse;
import com.mom.account.domain.FamilyRole;
import com.mom.account.service.AccountService;
import com.mom.account.service.PremiumEntitlementService;
import com.mom.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class AccountController {

    private final AccountService accountService;
    private final PremiumEntitlementService premiumEntitlementService;

    @PostMapping("/users")
    public ApiResponse<UserResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
        return ApiResponse.ok("User created", accountService.createUser(request));
    }

    @GetMapping("/users/{id}")
    public ApiResponse<UserResponse> getUser(@PathVariable("id") Long userId) {
        return ApiResponse.ok("Success", accountService.getUser(userId));
    }

    @GetMapping("/users/lookup")
    public ApiResponse<UserResponse> lookupUser(
            @RequestParam(value = "username", required = false) String username,
            @RequestParam(value = "email", required = false) String email
    ) {
        return ApiResponse.ok("Success", accountService.getUserByIdentity(username, email));
    }

    @PutMapping("/users/{id}/preferences")
    public ApiResponse<UserResponse> updatePreferences(
            @PathVariable("id") Long userId,
            @Valid @RequestBody UpdatePreferencesRequest request
    ) {
        return ApiResponse.ok("Preferences updated", accountService.updatePreferences(userId, request));
    }

    @PostMapping("/families")
    public ApiResponse<FamilyResponse> createFamily(@Valid @RequestBody CreateFamilyRequest request) {
        return ApiResponse.ok("Family created", accountService.createFamily(request));
    }

    @GetMapping("/families/{id}")
    public ApiResponse<FamilyResponse> getFamily(@PathVariable("id") Long familyId) {
        return ApiResponse.ok("Success", accountService.getFamily(familyId));
    }

    @GetMapping("/families/{id}/features/resolved")
    public ApiResponse<List<ResolvedFeatureAccessResponse>> resolveFamilyFeatures(@PathVariable("id") Long familyId) {
        return ApiResponse.ok("Success", premiumEntitlementService.resolveFamilyFeatures(familyId));
    }

    @GetMapping("/admin/families")
    public ApiResponse<List<FamilyResponse>> getAllFamiliesForAdmin() {
        return ApiResponse.ok("Success", accountService.getAllFamiliesForAdmin());
    }

    @GetMapping("/admin/families/{id}")
    public ApiResponse<FamilyResponse> getFamilyForAdmin(@PathVariable("id") Long familyId) {
        com.mom.common.context.UserContext.setFamilyIds(null); // Bypass family check
        return ApiResponse.ok("Success", accountService.getFamily(familyId));
    }

    @PostMapping("/admin/families")
    public ApiResponse<FamilyResponse> createFamilyForAdmin(@Valid @RequestBody CreateFamilyRequest request) {
        return ApiResponse.ok("Family created", accountService.createFamily(request));
    }

    @PutMapping("/admin/families/{id}")
    public ApiResponse<FamilyResponse> updateFamilyForAdmin(
            @PathVariable("id") Long familyId,
            @Valid @RequestBody UpdateFamilyRequest request
    ) {
        return ApiResponse.ok("Family updated", accountService.updateFamilyForAdmin(familyId, request));
    }

    @DeleteMapping("/admin/families/{id}")
    public ApiResponse<Void> deleteFamilyForAdmin(@PathVariable("id") Long familyId) {
        accountService.deleteFamilyForAdmin(familyId);
        return ApiResponse.ok("Family deleted", null);
    }

    @GetMapping("/admin/premium/features")
    public ApiResponse<List<PremiumFeatureResponse>> getPremiumFeaturesForAdmin() {
        return ApiResponse.ok("Success", premiumEntitlementService.getPremiumFeaturesForAdmin());
    }

    @GetMapping("/admin/families/{id}/entitlements")
    public ApiResponse<List<FamilyFeatureEntitlementResponse>> getFamilyEntitlementsForAdmin(
            @PathVariable("id") Long familyId
    ) {
        return ApiResponse.ok("Success", premiumEntitlementService.getFamilyEntitlementsForAdmin(familyId));
    }

    @PutMapping("/admin/families/{id}/entitlements")
    public ApiResponse<List<FamilyFeatureEntitlementResponse>> updateFamilyEntitlementsForAdmin(
            @PathVariable("id") Long familyId,
            @Valid @RequestBody UpdateFamilyEntitlementsRequest request
    ) {
        return ApiResponse.ok("Entitlements updated", premiumEntitlementService.updateFamilyEntitlementsForAdmin(familyId, request));
    }

    @GetMapping("/admin/families/{id}/entitlements/audit")
    public ApiResponse<List<FamilyFeatureAuditLogResponse>> getFamilyEntitlementAuditForAdmin(
            @PathVariable("id") Long familyId
    ) {
        return ApiResponse.ok("Success", premiumEntitlementService.getFamilyEntitlementAuditForAdmin(familyId));
    }

    @PostMapping("/families/{id}/members")
    public ApiResponse<FamilyResponse> addFamilyMember(
            @PathVariable("id") Long familyId,
            @Valid @RequestBody AddFamilyMemberRequest request
    ) {
        return ApiResponse.ok("Family member added", accountService.addMember(familyId, request));
    }

    @PostMapping("/families/{id}/members/invite")
    public ApiResponse<FamilyResponse> inviteFamilyMember(
            @PathVariable("id") Long familyId,
            @Valid @RequestBody InviteFamilyMemberRequest request
    ) {
        log.info("Invitation request for family {}: {}", familyId, request);
        return ApiResponse.ok("Family member invited", accountService.inviteMemberWithAccount(familyId, request));
    }

    @GetMapping("/users/{id}/families")
    public ApiResponse<List<FamilyResponse>> getUserFamilies(@PathVariable("id") Long userId) {
        return ApiResponse.ok("Success", accountService.getUserFamilies(userId));
    }

    @GetMapping("/families/{id}/birthdays/upcoming")
    public ApiResponse<List<UpcomingBirthdayResponse>> getUpcomingBirthdays(
            @PathVariable("id") Long familyId,
            @RequestParam(value = "days", required = false, defaultValue = "14") int days
    ) {
        return ApiResponse.ok("Success", accountService.getUpcomingBirthdays(familyId, days));
    }

    @GetMapping("/admin/users/{id}/families")
    public ApiResponse<List<FamilyResponse>> getUserFamiliesForAdmin(@PathVariable("id") Long userId) {
        return ApiResponse.ok("Success", accountService.getUserFamiliesForAdmin(userId));
    }

    @GetMapping("/admin/families/{id}/birthdays/upcoming")
    public ApiResponse<List<UpcomingBirthdayResponse>> getUpcomingBirthdaysForAdmin(
            @PathVariable("id") Long familyId,
            @RequestParam(value = "days", required = false, defaultValue = "14") int days
    ) {
        com.mom.common.context.UserContext.setFamilyIds(null); // Bypass family check
        return ApiResponse.ok("Success", accountService.getUpcomingBirthdays(familyId, days));
    }

    @PutMapping("/families/{id}/members/{userId}/role")
    public ApiResponse<FamilyResponse> updateMemberRole(
            @PathVariable("id") Long familyId,
            @PathVariable("userId") Long userId,
            @RequestParam("role") FamilyRole role
    ) {
        return ApiResponse.ok("Member role updated", accountService.updateMemberRole(familyId, userId, role));
    }

    @DeleteMapping("/families/{id}/members/{userId}")
    public ApiResponse<Void> removeFamilyMember(
            @PathVariable("id") Long familyId,
            @PathVariable("userId") Long userId
    ) {
        accountService.removeMember(familyId, userId);
        return ApiResponse.ok("Member removed from family", null);
    }

    @PutMapping("/families/{id}/members/{userId}")
    public ApiResponse<FamilyResponse> updateFamilyMember(
            @PathVariable("id") Long familyId,
            @PathVariable("userId") Long userId,
            @Valid @RequestBody com.mom.account.controller.dto.UpdateFamilyMemberRequest request
    ) {
        return ApiResponse.ok("Family member updated", accountService.updateMember(familyId, userId, request));
    }

    // --- Admin Endpoints for Member Management ---

    @PostMapping("/admin/families/{id}/members/invite")
    public ApiResponse<FamilyResponse> inviteFamilyMemberForAdmin(
            @PathVariable("id") Long familyId,
            @Valid @RequestBody InviteFamilyMemberRequest request
    ) {
        com.mom.common.context.UserContext.setFamilyIds(null); // Bypass family check
        log.info("Admin Invitation request for family {}: {}", familyId, request);
        return ApiResponse.ok("Family member invited", accountService.inviteMemberWithAccount(familyId, request));
    }

    @PutMapping("/admin/families/{id}/members/{userId}/role")
    public ApiResponse<FamilyResponse> updateMemberRoleForAdmin(
            @PathVariable("id") Long familyId,
            @PathVariable("userId") Long userId,
            @RequestParam("role") FamilyRole role
    ) {
        com.mom.common.context.UserContext.setFamilyIds(null); // Bypass family check
        return ApiResponse.ok("Member role updated", accountService.updateMemberRole(familyId, userId, role));
    }

    @DeleteMapping("/admin/families/{id}/members/{userId}")
    public ApiResponse<Void> removeFamilyMemberForAdmin(
            @PathVariable("id") Long familyId,
            @PathVariable("userId") Long userId
    ) {
        com.mom.common.context.UserContext.setFamilyIds(null); // Bypass family check
        accountService.removeMember(familyId, userId);
        return ApiResponse.ok("Member removed from family", null);
    }

    @PutMapping("/admin/families/{id}/members/{userId}")
    public ApiResponse<FamilyResponse> updateFamilyMemberForAdmin(
            @PathVariable("id") Long familyId,
            @PathVariable("userId") Long userId,
            @Valid @RequestBody com.mom.account.controller.dto.UpdateFamilyMemberRequest request
    ) {
        com.mom.common.context.UserContext.setFamilyIds(null); // Bypass family check
        return ApiResponse.ok("Family member updated", accountService.updateMember(familyId, userId, request));
    }
}
