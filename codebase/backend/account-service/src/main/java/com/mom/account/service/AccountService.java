package com.mom.account.service;

import com.mom.account.controller.dto.AddFamilyMemberRequest;
import com.mom.account.controller.dto.CreateFamilyRequest;
import com.mom.account.controller.dto.CreateUserRequest;
import com.mom.account.controller.dto.FamilyMemberResponse;
import com.mom.account.controller.dto.FamilyResponse;
import com.mom.account.controller.dto.InviteFamilyMemberRequest;
import com.mom.account.controller.dto.UpcomingBirthdayResponse;
import com.mom.account.controller.dto.UpdateFamilyRequest;
import com.mom.account.controller.dto.UserResponse;
import com.mom.account.domain.FamilyEntity;
import com.mom.account.domain.FamilyMemberEntity;
import com.mom.account.domain.FamilyRelation;
import com.mom.account.domain.FamilyRole;
import com.mom.account.domain.UserEntity;
import com.mom.account.event.AccountEventPublisher;
import com.mom.account.event.FamilyCreatedPayload;
import com.mom.account.event.UserCreatedPayload;
import com.mom.account.repository.FamilyMemberRepository;
import com.mom.account.repository.FamilyRepository;
import com.mom.account.repository.UserRepository;
import com.mom.common.context.UserContext;
import com.mom.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Random;

@Service
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class AccountService {

    private final UserRepository userRepository;
    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final AccountEventPublisher accountEventPublisher;
    private final RestClient.Builder restClientBuilder;

    @Value("${AUTH_SERVICE_URI:http://localhost:8081}")
    private String authServiceUri;

    private static final String PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%";
    private static final Random RANDOM = new Random();

    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        validateLocalIdentityAvailable(request.username(), request.email());

        UserEntity user = new UserEntity();
        if (request.id() != null) {
            user.setId(request.id());
        }
        user.setUsername(request.username().trim());
        user.setEmail(request.email().trim().toLowerCase());
        user.setDisplayName(request.displayName().trim());
        user.setDateOfBirth(request.dateOfBirth());
        UserEntity saved = userRepository.save(user);
        accountEventPublisher.publishUserCreated(new UserCreatedPayload(
                saved.getId(),
                saved.getUsername(),
                saved.getEmail(),
                saved.getDisplayName()
        ));
        return toUserResponse(saved);
    }

    public UserResponse getUser(Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return toUserResponse(user);
    }

    public UserResponse getUserByIdentity(String username, String email) {
        UserEntity user;
        if (StringUtils.hasText(username)) {
            user = userRepository.findByUsernameIgnoreCase(username.trim())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        } else if (StringUtils.hasText(email)) {
            user = userRepository.findByEmailIgnoreCase(email.trim())
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        } else {
            throw new IllegalArgumentException("username or email is required");
        }

        validateUserAccessIfContextPresent(user.getId());
        return toUserResponse(user);
    }

    @Transactional
    public FamilyResponse createFamily(CreateFamilyRequest request) {
        UserEntity creator = userRepository.findById(request.createdByUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Creator user not found"));

        FamilyEntity family = new FamilyEntity();
        family.setName(request.name().trim());
        family.setCreatedByUserId(request.createdByUserId());
        FamilyEntity savedFamily = familyRepository.save(family);

        FamilyMemberEntity ownerMember = new FamilyMemberEntity();
        ownerMember.setFamilyId(savedFamily.getId());
        ownerMember.setUserId(creator.getId());
        ownerMember.setRole(FamilyRole.MOM);
        ownerMember.setRelation(FamilyRelation.ME);
        familyMemberRepository.save(ownerMember);
        accountEventPublisher.publishFamilyCreated(new FamilyCreatedPayload(
                savedFamily.getId(),
                savedFamily.getName(),
                savedFamily.getCreatedByUserId()
        ));

        return buildFamilyResponse(savedFamily);
    }

    @Transactional
    public FamilyResponse addMember(Long familyId, AddFamilyMemberRequest request) {
        validateFamilyRole(request.role());
        validateFamilyAccessIfContextPresent(familyId);

        familyRepository.findById(familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Family not found"));
        UserEntity user = userRepository.findById(request.userId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        boolean alreadyInFamily = familyMemberRepository.findByFamilyId(familyId).stream()
                .anyMatch(member -> member.getUserId().equals(request.userId()));
        if (alreadyInFamily) {
            throw new IllegalArgumentException("User already exists in family");
        }

        FamilyMemberEntity member = new FamilyMemberEntity();
        member.setFamilyId(familyId);
        member.setUserId(request.userId());
        member.setRole(request.role());
        member.setRelation(request.relation() != null ? request.relation() : defaultRelationByRole(request.role()));
        member.setParentUserId(validateParentUserId(familyId, request.userId(), request.parentUserId()));
        familyMemberRepository.save(member);

        if (request.dateOfBirth() != null) {
            user.setDateOfBirth(request.dateOfBirth());
            userRepository.save(user);
        }

        return getFamily(familyId);
    }

    @Transactional
    public FamilyResponse inviteMemberWithAccount(Long familyId, InviteFamilyMemberRequest request) {
        validateFamilyAccessIfContextPresent(familyId);
        validateFamilyRole(request.role());
        familyRepository.findById(familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Family not found"));

        String normalizedUsername = request.username().trim();
        String normalizedEmail = request.email().trim().toLowerCase(Locale.ROOT);
        String normalizedDisplayName = request.displayName().trim();
        validateLocalIdentityAvailable(normalizedUsername, normalizedEmail);
        String temporaryPassword = generateTemporaryPassword();

        Long authUserId = provisionAuthenticationAccount(
                normalizedUsername,
                normalizedEmail,
                normalizedDisplayName,
                temporaryPassword,
                request.dateOfBirth()
        );

        UserResponse accountUser = createUser(new CreateUserRequest(
                authUserId,
                normalizedUsername,
                normalizedEmail,
                normalizedDisplayName,
                request.dateOfBirth()
        ));

        return addMember(
                familyId,
                new AddFamilyMemberRequest(
                        accountUser.id(),
                        request.role(),
                        request.relation(),
                        request.parentUserId(),
                        request.dateOfBirth()
                )
        );
    }

    public FamilyResponse getFamily(Long familyId) {
        validateFamilyAccessIfContextPresent(familyId);

        FamilyEntity family = familyRepository.findById(familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Family not found"));
        return buildFamilyResponse(family);
    }

    public List<FamilyResponse> getAllFamiliesForAdmin() {
        ensureRequestAuthenticated();
        return familyRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::buildFamilyResponse)
                .toList();
    }

    @Transactional
    public FamilyResponse updateFamilyForAdmin(Long familyId, UpdateFamilyRequest request) {
        ensureRequestAuthenticated();

        FamilyEntity family = familyRepository.findById(familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Family not found"));
        family.setName(request.name().trim());
        familyRepository.save(family);

        return buildFamilyResponse(family);
    }

    @Transactional
    public void deleteFamilyForAdmin(Long familyId) {
        ensureRequestAuthenticated();

        FamilyEntity family = familyRepository.findById(familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Family not found"));
        familyMemberRepository.deleteAllByFamilyId(familyId);
        familyRepository.delete(family);
    }

    public List<FamilyResponse> getUserFamilies(Long userId) {
        validateUserAccessIfContextPresent(userId);

        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return familyMemberRepository.findByUserId(userId).stream()
                .map(member -> getFamily(member.getFamilyId()))
                .toList();
    }

    public List<FamilyResponse> getUserFamiliesForAdmin(Long userId) {
        ensureRequestAuthenticated();

        userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return familyMemberRepository.findByUserId(userId).stream()
                .map(member -> getFamily(member.getFamilyId()))
                .toList();
    }

    public List<UpcomingBirthdayResponse> getUpcomingBirthdays(Long familyId, int days) {
        validateFamilyAccessIfContextPresent(familyId);
        if (days < 0) {
            throw new IllegalArgumentException("days must be greater than or equal to 0");
        }

        familyRepository.findById(familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Family not found"));

        LocalDate today = LocalDate.now();
        return familyMemberRepository.findByFamilyId(familyId).stream()
                .map(member -> {
                    UserEntity user = userRepository.findById(member.getUserId()).orElse(null);
                    if (user == null || user.getDateOfBirth() == null) {
                        return null;
                    }

                    LocalDate nextBirthday = resolveNextBirthday(user.getDateOfBirth(), today);
                    long daysUntil = ChronoUnit.DAYS.between(today, nextBirthday);
                    if (daysUntil > days) {
                        return null;
                    }

                    return new UpcomingBirthdayResponse(
                            member.getUserId(),
                            user.getDisplayName(),
                            member.getRole(),
                            member.getRelation(),
                            user.getDateOfBirth(),
                            nextBirthday,
                            daysUntil,
                            nextBirthday.getYear() - user.getDateOfBirth().getYear()
                    );
                })
                .filter(java.util.Objects::nonNull)
                .sorted((left, right) -> {
                    int byDay = Long.compare(left.daysUntilBirthday(), right.daysUntilBirthday());
                    if (byDay != 0) {
                        return byDay;
                    }
                    return left.displayName().compareToIgnoreCase(right.displayName());
                })
                .toList();
    }

    @Transactional
    public FamilyResponse updateMemberRole(Long familyId, Long userId, FamilyRole newRole) {
        validateFamilyRole(newRole);
        validateFamilyAccessIfContextPresent(familyId);

        FamilyMemberEntity member = familyMemberRepository.findByFamilyId(familyId).stream()
                .filter(m -> m.getUserId().equals(userId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("User is not a member of this family"));
        member.setRole(newRole);
        familyMemberRepository.save(member);
        return getFamily(familyId);
    }

    @Transactional
    public void removeMember(Long familyId, Long userId) {
        validateFamilyAccessIfContextPresent(familyId);

        FamilyMemberEntity member = familyMemberRepository.findByFamilyId(familyId).stream()
                .filter(m -> m.getUserId().equals(userId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("User is not a member of this family"));
        
        familyMemberRepository.delete(member);
    }

    @Transactional
    public FamilyResponse updateMember(Long familyId, Long userId, com.mom.account.controller.dto.UpdateFamilyMemberRequest request) {
        validateFamilyRole(request.role());
        validateFamilyAccessIfContextPresent(familyId);

        FamilyMemberEntity member = familyMemberRepository.findByFamilyId(familyId).stream()
                .filter(m -> m.getUserId().equals(userId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("User is not a member of this family"));

        member.setRole(request.role());
        member.setRelation(request.relation() != null ? request.relation() : defaultRelationByRole(request.role()));
        member.setParentUserId(validateParentUserId(familyId, userId, request.parentUserId()));
        familyMemberRepository.save(member);

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!user.getUsername().equalsIgnoreCase(request.username())) {
            userRepository.findByUsername(request.username()).ifPresent(existing -> {
                throw new IllegalArgumentException("Username already exists");
            });
        }
        if (!user.getEmail().equalsIgnoreCase(request.email())) {
            userRepository.findByEmailIgnoreCase(request.email()).ifPresent(existing -> {
                throw new IllegalArgumentException("Email already exists");
            });
        }

        user.setDisplayName(request.displayName().trim());
        user.setUsername(request.username().trim());
        user.setEmail(request.email().trim().toLowerCase());
        user.setDateOfBirth(request.dateOfBirth());
        userRepository.save(user);

        return getFamily(familyId);
    }

    private UserResponse toUserResponse(UserEntity user) {
        return new UserResponse(user.getId(), user.getUsername(), user.getEmail(), user.getDisplayName(), user.getDateOfBirth());
    }

    private FamilyResponse buildFamilyResponse(FamilyEntity family) {
        List<FamilyMemberResponse> members = familyMemberRepository.findByFamilyId(family.getId()).stream()
                .map(member -> {
                    UserEntity user = userRepository.findById(member.getUserId()).orElse(null);
                    String displayName = user != null ? user.getDisplayName() : "Unknown";
                    LocalDate dateOfBirth = user != null ? user.getDateOfBirth() : null;
                    return new FamilyMemberResponse(
                            member.getUserId(),
                            displayName,
                            member.getRole(),
                            member.getRelation(),
                            member.getParentUserId(),
                            dateOfBirth
                    );
                })
                .toList();

        return new FamilyResponse(family.getId(), family.getName(), family.getCreatedByUserId(), members);
    }

    private Long validateParentUserId(Long familyId, Long userId, Long parentUserId) {
        if (parentUserId == null) {
            return null;
        }
        if (parentUserId.equals(userId)) {
            throw new IllegalArgumentException("parentUserId must be different from userId");
        }

        boolean parentInFamily = familyMemberRepository.findByFamilyId(familyId).stream()
                .anyMatch(member -> member.getUserId().equals(parentUserId));
        if (!parentInFamily) {
            throw new IllegalArgumentException("parentUserId must belong to the same family");
        }

        return parentUserId;
    }

    private FamilyRelation defaultRelationByRole(FamilyRole role) {
        if (role == FamilyRole.MOM) {
            return FamilyRelation.ME;
        }
        if (role == FamilyRole.DAD) {
            return FamilyRelation.BO;
        }
        if (role == FamilyRole.GRANDMA) {
            return FamilyRelation.BA_NOI;
        }
        if (role == FamilyRole.CAREGIVER) {
            return FamilyRelation.BAO_MAU;
        }
        return FamilyRelation.THANH_VIEN_KHAC;
    }

    private void validateFamilyRole(FamilyRole role) {
        if (role == FamilyRole.ADMIN) {
            throw new IllegalArgumentException("ADMIN role is not allowed for family member accounts");
        }
    }

    private void validateLocalIdentityAvailable(String username, String email) {
        userRepository.findByUsernameIgnoreCase(username).ifPresent(existing -> {
            throw new IllegalArgumentException("Username already exists");
        });
        userRepository.findByEmailIgnoreCase(email).ifPresent(existing -> {
            throw new IllegalArgumentException("Email already exists");
        });
    }

    private Long provisionAuthenticationAccount(
            String username,
            String email,
            String displayName,
            String temporaryPassword,
            LocalDate dateOfBirth
    ) {
        NameParts nameParts = splitDisplayName(displayName);
        LocalDate normalizedBirthDate = dateOfBirth != null ? dateOfBirth : defaultBirthDate();
        AuthCreateUserRequest payload = new AuthCreateUserRequest(
                nameParts.firstName(),
                nameParts.lastName(),
                java.util.Date.from(normalizedBirthDate.atStartOfDay(ZoneId.systemDefault()).toInstant()),
                "other",
                "0000000000",
                email,
                username,
                temporaryPassword,
                "user",
                true,
                true
        );

        try {
            return restClientBuilder.build()
                    .post()
                    .uri(authServiceUri + "/account/user/add")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(Long.class);
        } catch (RestClientResponseException ex) {
            String body = ex.getResponseBodyAsString();
            log.error("Failed to create authentication account. Status: {}, Body: {}", ex.getStatusCode(), body);
            throw new IllegalArgumentException(
                    StringUtils.hasText(body) ? body : "Failed to create authentication account",
                    ex
            );
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to create authentication account", ex);
        }
    }

    private NameParts splitDisplayName(String displayName) {
        String[] parts = displayName.trim().split("\\s+");
        if (parts.length == 0) {
            return new NameParts("Family", "Member");
        }
        if (parts.length == 1) {
            return new NameParts(parts[0], "Member");
        }
        String firstName = parts[0];
        String lastName = String.join(" ", java.util.Arrays.copyOfRange(parts, 1, parts.length));
        return new NameParts(firstName, lastName);
    }

    private LocalDate resolveNextBirthday(LocalDate dateOfBirth, LocalDate referenceDate) {
        LocalDate thisYearBirthday = normalizeBirthday(dateOfBirth, referenceDate.getYear());
        if (!thisYearBirthday.isBefore(referenceDate)) {
            return thisYearBirthday;
        }
        return normalizeBirthday(dateOfBirth, referenceDate.getYear() + 1);
    }

    private LocalDate normalizeBirthday(LocalDate dateOfBirth, int year) {
        int month = dateOfBirth.getMonthValue();
        int day = Math.min(dateOfBirth.getDayOfMonth(), LocalDate.of(year, month, 1).lengthOfMonth());
        return LocalDate.of(year, month, day);
    }

    private LocalDate defaultBirthDate() {
        return LocalDate.of(1990, 1, 1);
    }

    private String generateTemporaryPassword() {
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < 10; i++) {
            int index = RANDOM.nextInt(PASSWORD_ALPHABET.length());
            builder.append(PASSWORD_ALPHABET.charAt(index));
        }
        builder.append("1aA");
        return builder.toString();
    }

    private record NameParts(String firstName, String lastName) {}

    private record AuthCreateUserRequest(
            String firstName,
            String lastName,
            java.util.Date dateOfBirth,
            String gender,
            String phone,
            String email,
            String username,
            String password,
            String type,
            Boolean sendCredentialEmail,
            Boolean requirePasswordChange
    ) {}

    private void validateFamilyAccessIfContextPresent(Long familyId) {
        List<Long> allowedFamilyIds = UserContext.getFamilyIds();
        if (allowedFamilyIds == null || allowedFamilyIds.isEmpty()) {
            return;
        }
        if (!allowedFamilyIds.contains(familyId)) {
            throw new AccessDeniedException("Access denied for familyId: " + familyId);
        }
    }

    private void validateUserAccessIfContextPresent(Long userId) {
        Long currentUserId = UserContext.getUserId();
        if (currentUserId == null) {
            return;
        }
        if (!currentUserId.equals(userId)) {
            throw new AccessDeniedException("Access denied for userId: " + userId);
        }
    }

    private void ensureRequestAuthenticated() {
        if (UserContext.getUserId() == null) {
            throw new AccessDeniedException("Access denied: missing user context");
        }
    }
}
