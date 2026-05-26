package com.mom.account.service;

import com.mom.account.controller.dto.AddFamilyMemberRequest;
import com.mom.account.controller.dto.CreateFamilyRequest;
import com.mom.account.controller.dto.CreateUserRequest;
import com.mom.account.controller.dto.FamilyMemberResponse;
import com.mom.account.controller.dto.FamilyResponse;
import com.mom.account.controller.dto.InviteFamilyMemberRequest;
import com.mom.account.controller.dto.PageResponse;
import com.mom.account.controller.dto.UpcomingBirthdayResponse;
import com.mom.account.controller.dto.UpdateFamilyRequest;
import com.mom.account.controller.dto.UpdatePreferencesRequest;
import com.mom.account.controller.dto.UpdateProfileRequest;
import com.mom.account.controller.dto.UserResponse;
import com.mom.account.controller.dto.UserPreferences;
import com.mom.account.controller.dto.ResolvedFeatureAccessResponse;
import com.mom.account.domain.FamilyEntity;
import com.mom.account.domain.FamilyQuestStateEntity;
import com.mom.account.domain.FamilyMemberEntity;
import com.mom.account.domain.FamilyRelation;
import com.mom.account.domain.FamilyRole;
import com.mom.account.domain.UserEntity;
import com.mom.account.event.AccountEventPublisher;
import com.mom.account.event.FamilyCreatedPayload;
import com.mom.account.event.UserCreatedPayload;
import com.mom.account.premium.PremiumFeatures;
import com.mom.account.repository.FamilyMemberRepository;
import com.mom.account.repository.FamilyRepository;
import com.mom.account.repository.FamilyQuestStateRepository;
import com.mom.account.repository.UserRepository;
import com.mom.common.context.UserContext;
import com.mom.common.exception.ResourceNotFoundException;
import com.lowagie.text.*;
import com.lowagie.text.pdf.BaseFont;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPCell;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
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
    private final FamilyQuestStateRepository familyQuestStateRepository;
    private final AccountEventPublisher accountEventPublisher;
    private final PremiumEntitlementService premiumEntitlementService;
    private final RestClient.Builder restClientBuilder;

    @Value("${AUTH_SERVICE_URI:http://localhost:8081}")
    private String authServiceUri;

    private static final BaseFont PROFILE_PDF_REGULAR_FONT = loadProfilePdfBaseFont(
            "profile.pdf.font.regular",
            "PROFILE_PDF_FONT_REGULAR",
            List.of(
                    "C:\\Windows\\Fonts\\arial.ttf",
                    "C:\\Windows\\Fonts\\segoeui.ttf",
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                    "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
                    "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
                    "/Library/Fonts/Arial Unicode.ttf"
            )
    );
    private static final BaseFont PROFILE_PDF_BOLD_FONT = loadProfilePdfBaseFont(
            "profile.pdf.font.bold",
            "PROFILE_PDF_FONT_BOLD",
            List.of(
                    "C:\\Windows\\Fonts\\arialbd.ttf",
                    "C:\\Windows\\Fonts\\segoeuib.ttf",
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                    "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
                    "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
                    "/Library/Fonts/Arial Unicode.ttf"
            )
    );
    private static final BaseFont PROFILE_PDF_ITALIC_FONT = loadProfilePdfBaseFont(
            "profile.pdf.font.italic",
            "PROFILE_PDF_FONT_ITALIC",
            List.of(
                    "C:\\Windows\\Fonts\\ariali.ttf",
                    "C:\\Windows\\Fonts\\segoeuii.ttf",
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf",
                    "/usr/share/fonts/truetype/liberation2/LiberationSans-Italic.ttf",
                    "/usr/share/fonts/truetype/noto/NotoSans-Italic.ttf",
                    "/Library/Fonts/Arial Unicode.ttf"
            )
    );

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

    public UserPreferences getPreferences(Long userId) {
        validateUserAccessIfContextPresent(userId);

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return user.getPreferences();
    }

    @Transactional
    public UserResponse updatePreferences(Long userId, UpdatePreferencesRequest request) {
        validateUserAccessIfContextPresent(userId);

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setPreferences(request.preferences());
        userRepository.save(user);

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
        premiumEntitlementService.requireFeature(familyId, PremiumFeatures.FAMILY_COLLABORATION_PLUS);

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
        premiumEntitlementService.requireFeature(familyId, PremiumFeatures.FAMILY_COLLABORATION_PLUS);
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

    public PageResponse<FamilyResponse> getAllFamiliesPageForAdmin(int page, int size, String searchText) {
        ensureRequestAuthenticated();
        String normalizedSearch = (searchText == null || searchText.isBlank()) ? null : searchText.trim();
        PageRequest pageable = PageRequest.of(Math.max(page, 0), Math.max(size, 1));
        Page<FamilyEntity> resultPage = familyRepository.searchFamilies(normalizedSearch, pageable);
        List<FamilyResponse> items = resultPage.getContent().stream()
                .map(this::buildFamilyResponse)
                .toList();
        return PageResponse.<FamilyResponse>builder()
                .page(resultPage.getNumber())
                .size(resultPage.getSize())
                .total(resultPage.getTotalElements())
                .items(items)
                .build();
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
        premiumEntitlementService.requireFeature(familyId, PremiumFeatures.FAMILY_COLLABORATION_PLUS);

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
        premiumEntitlementService.requireFeature(familyId, PremiumFeatures.FAMILY_COLLABORATION_PLUS);

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
        premiumEntitlementService.requireFeature(familyId, PremiumFeatures.FAMILY_COLLABORATION_PLUS);

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
        return new UserResponse(user.getId(), user.getUsername(), user.getEmail(), user.getDisplayName(), user.getDateOfBirth(), user.getPreferences());
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

    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest request) {
        validateUserAccessIfContextPresent(userId);

        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!user.getEmail().equalsIgnoreCase(request.email())) {
            userRepository.findByEmailIgnoreCase(request.email()).ifPresent(existing -> {
                throw new IllegalArgumentException("Email already exists");
            });
        }

        user.setDisplayName(request.displayName().trim());
        user.setEmail(request.email().trim().toLowerCase());
        user.setDateOfBirth(request.dateOfBirth());
        UserEntity saved = userRepository.save(user);

        return toUserResponse(saved);
    }

    public byte[] generateProfilePdf(Long userId) {
        validateUserAccessIfContextPresent(userId);
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<FamilyMemberEntity> members = familyMemberRepository.findByUserId(userId);
        FamilyEntity family = null;
        List<FamilyMemberResponse> familyMembers = List.of();
        if (!members.isEmpty()) {
            Long familyId = members.get(0).getFamilyId();
            family = familyRepository.findById(familyId).orElse(null);
            if (family != null) {
                familyMembers = familyMemberRepository.findByFamilyId(familyId).stream()
                        .map(m -> {
                            UserEntity u = userRepository.findById(m.getUserId()).orElse(null);
                            String dName = u != null ? u.getDisplayName() : "Unknown";
                            return new FamilyMemberResponse(m.getUserId(), dName, m.getRole(), m.getRelation(), m.getParentUserId(), u != null ? u.getDateOfBirth() : null);
                        })
                        .toList();
            }
        }

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 36, 36);
        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Premium Color Palette (Warm Fintech style)
            java.awt.Color primaryCam = new java.awt.Color(249, 115, 22);     // #f97316
            java.awt.Color darkGray = new java.awt.Color(31, 41, 55);         // #1f2937
            java.awt.Color lightGrayText = new java.awt.Color(107, 114, 128); // #6b7280
            java.awt.Color borderGray = new java.awt.Color(229, 231, 235);    // #e5e7eb
            java.awt.Color bgLightGray = new java.awt.Color(249, 250, 251);   // #f9fafb
            java.awt.Color bgOrangeLight = new java.awt.Color(255, 247, 237); // #fff7ed

            // Use embedded TrueType fonts with Identity-H encoding so Vietnamese text renders correctly.
            Font brandFont = profilePdfBoldFont(10, primaryCam);
            Font titleFont = profilePdfBoldFont(22, darkGray);
            Font subTitleFont = profilePdfRegularFont(9, lightGrayText);
            Font sectionFont = profilePdfBoldFont(13, primaryCam);
            Font labelFont = profilePdfBoldFont(10, lightGrayText);
            Font valueFont = profilePdfRegularFont(10, darkGray);
            Font tableHeaderFont = profilePdfBoldFont(10, new java.awt.Color(234, 88, 12));
            Font footerFont = profilePdfItalicFont(8, lightGrayText);
            Font securityBadgeFont = profilePdfBoldFont(8, new java.awt.Color(22, 163, 74));

            // 1. TOP GRADIENT ACCENT STRIP
            PdfPTable headerAccentTable = new PdfPTable(1);
            headerAccentTable.setWidthPercentage(100);
            PdfPCell accentCell = new PdfPCell();
            accentCell.setFixedHeight(4f);
            accentCell.setBackgroundColor(primaryCam);
            accentCell.setBorder(0);
            headerAccentTable.addCell(accentCell);
            document.add(headerAccentTable);

            // Spacer
            Paragraph spacer1 = new Paragraph("\n");
            spacer1.setLeading(10);
            document.add(spacer1);

            // 2. BRAND & HEADER SECTION
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{65f, 35f});

            // Title and metadata left cell
            PdfPCell leftHeader = new PdfPCell();
            leftHeader.setBorder(0);
            Paragraph brandText = new Paragraph("MOM SUPER APP PLATFORM", brandFont);
            brandText.setLeading(14);
            leftHeader.addElement(brandText);

            Paragraph docTitle = new Paragraph("USER PROFILE REPORT", titleFont);
            docTitle.setLeading(26);
            leftHeader.addElement(docTitle);

            Paragraph subText = new Paragraph("Official secure personal data & family record summary.", subTitleFont);
            subText.setLeading(14);
            leftHeader.addElement(subText);
            headerTable.addCell(leftHeader);

            // Right Cell: Report meta
            PdfPCell rightHeader = new PdfPCell();
            rightHeader.setBorder(0);
            rightHeader.setHorizontalAlignment(Element.ALIGN_RIGHT);
            
            Paragraph sysStatus = new Paragraph("STATUS: ACTIVE VERIFIED", securityBadgeFont);
            sysStatus.setAlignment(Element.ALIGN_RIGHT);
            rightHeader.addElement(sysStatus);

            Paragraph dateText = new Paragraph("Date: " + LocalDate.now().toString(), subTitleFont);
            dateText.setAlignment(Element.ALIGN_RIGHT);
            rightHeader.addElement(dateText);

            Paragraph docIdText = new Paragraph("Ref: MOM-USR-" + String.format("%06d", userId), subTitleFont);
            docIdText.setAlignment(Element.ALIGN_RIGHT);
            rightHeader.addElement(docIdText);
            headerTable.addCell(rightHeader);

            document.add(headerTable);

            // Horizontal Line
            PdfPTable dividerLine = new PdfPTable(1);
            dividerLine.setWidthPercentage(100);
            PdfPCell lineCell = new PdfPCell();
            lineCell.setFixedHeight(1f);
            lineCell.setBorder(0);
            lineCell.setBackgroundColor(borderGray);
            dividerLine.addCell(lineCell);
            
            Paragraph spacerDivider = new Paragraph("\n");
            spacerDivider.setLeading(15);
            document.add(spacerDivider);
            document.add(dividerLine);

            // 3. PERSONAL INFORMATION SECTION
            Paragraph personalHeader = new Paragraph("1. PERSONAL DATA CARD", sectionFont);
            personalHeader.setSpacingBefore(15);
            personalHeader.setSpacingAfter(10);
            document.add(personalHeader);

            // Personal Info Bento Card
            PdfPTable personalTable = new PdfPTable(2);
            personalTable.setWidthPercentage(100);
            personalTable.setWidths(new float[]{30f, 70f});

            String currency = "Not Specified";
            String language = "Not Specified";
            String notifyStatus = "Not Specified";
            if (user.getPreferences() != null) {
                if (user.getPreferences().currency() != null) {
                    currency = user.getPreferences().currency().toUpperCase();
                }
                if (user.getPreferences().language() != null) {
                    language = user.getPreferences().language().toUpperCase();
                }
                if (user.getPreferences().notificationEnabled() != null) {
                    notifyStatus = user.getPreferences().notificationEnabled() ? "ENABLED" : "DISABLED";
                }
            }
            String memberSince = user.getCreatedAt() != null ? user.getCreatedAt().toLocalDate().toString() : "Not Specified";

            addCardField(personalTable, "DISPLAY NAME:", user.getDisplayName(), labelFont, valueFont, bgLightGray, borderGray);
            addCardField(personalTable, "USERNAME ID:", user.getUsername(), labelFont, valueFont, java.awt.Color.WHITE, borderGray);
            addCardField(personalTable, "EMAIL ADDRESS:", user.getEmail(), labelFont, valueFont, bgLightGray, borderGray);
            addCardField(personalTable, "DATE OF BIRTH:", user.getDateOfBirth() != null ? user.getDateOfBirth().toString() : "Not Specified", labelFont, valueFont, java.awt.Color.WHITE, borderGray);
            addCardField(personalTable, "MEMBER SINCE:", memberSince, labelFont, valueFont, bgLightGray, borderGray);
            addCardField(personalTable, "PREFERRED CURRENCY:", currency, labelFont, valueFont, java.awt.Color.WHITE, borderGray);
            addCardField(personalTable, "SYSTEM LANGUAGE:", language, labelFont, valueFont, bgLightGray, borderGray);
            addCardField(personalTable, "NOTIFICATIONS:", notifyStatus, labelFont, valueFont, java.awt.Color.WHITE, borderGray);

            document.add(personalTable);

            // 4. FAMILY INFORMATION SECTION
            if (family != null) {
                Paragraph familyHeader = new Paragraph("2. FAMILY & MEMBERSHIP RECORD", sectionFont);
                familyHeader.setSpacingBefore(25);
                familyHeader.setSpacingAfter(10);
                document.add(familyHeader);

                // Family Name Card
                PdfPTable familyInfoTable = new PdfPTable(2);
                familyInfoTable.setWidthPercentage(100);
                familyInfoTable.setWidths(new float[]{30f, 70f});
                addCardField(familyInfoTable, "FAMILY GROUP NAME:", family.getName().toUpperCase(), labelFont, profilePdfBoldFont(10, darkGray), bgOrangeLight, borderGray);
                document.add(familyInfoTable);

                Paragraph spacerFamTable = new Paragraph("\n");
                spacerFamTable.setLeading(10);
                document.add(spacerFamTable);

                // Quest & Points Bento Card
                FamilyQuestStateEntity questState = familyQuestStateRepository.findById(family.getId()).orElse(null);
                String streakVal = "0 Days";
                String pointsVal = "0 PTS";
                String lastClaimVal = "No Activity";
                if (questState != null) {
                    streakVal = questState.getStreakDays() + " Days Streak";
                    pointsVal = String.format("%,d PTS", questState.getTotalPoints());
                    if (questState.getLastClaimDate() != null) {
                        lastClaimVal = questState.getLastClaimDate().toString();
                    }
                }

                PdfPTable familyQuestTable = new PdfPTable(2);
                familyQuestTable.setWidthPercentage(100);
                familyQuestTable.setWidths(new float[]{30f, 70f});
                addCardField(familyQuestTable, "ACTIVE QUEST STREAK:", streakVal, labelFont, valueFont, bgLightGray, borderGray);
                addCardField(familyQuestTable, "TOTAL ACCUMULATION POINTS:", pointsVal, labelFont, valueFont, java.awt.Color.WHITE, borderGray);
                addCardField(familyQuestTable, "LAST REWARD CLAIM DATE:", lastClaimVal, labelFont, valueFont, bgLightGray, borderGray);
                document.add(familyQuestTable);

                Paragraph spacerQuestTable = new Paragraph("\n");
                spacerQuestTable.setLeading(10);
                document.add(spacerQuestTable);

                // Members Table
                PdfPTable memberTable = new PdfPTable(4);
                memberTable.setWidthPercentage(100);
                memberTable.setWidths(new float[]{35f, 20f, 20f, 25f});

                addTableHeaderCell(memberTable, "MEMBER DISPLAY NAME", tableHeaderFont, bgOrangeLight, borderGray);
                addTableHeaderCell(memberTable, "ROLE TYPE", tableHeaderFont, bgOrangeLight, borderGray);
                addTableHeaderCell(memberTable, "FAMILY RELATION", tableHeaderFont, bgOrangeLight, borderGray);
                addTableHeaderCell(memberTable, "DATE OF BIRTH", tableHeaderFont, bgOrangeLight, borderGray);

                boolean zebra = false;
                for (var m : familyMembers) {
                    java.awt.Color rowBg = zebra ? bgLightGray : java.awt.Color.WHITE;
                    addTableCell(memberTable, m.displayName(), valueFont, rowBg, borderGray);
                    addTableCell(memberTable, m.role().toString(), valueFont, rowBg, borderGray);
                    addTableCell(memberTable, m.relation().toString(), valueFont, rowBg, borderGray);
                    addTableCell(memberTable, m.dateOfBirth() != null ? m.dateOfBirth().toString() : "Not Specified", valueFont, rowBg, borderGray);
                    zebra = !zebra;
                }
                document.add(memberTable);

                // 4.1 PREMIUM SERVICES SECTION
                Paragraph premiumHeader = new Paragraph("\n3. PREMIUM SERVICE SUBSCRIPTIONS", sectionFont);
                premiumHeader.setSpacingBefore(20);
                premiumHeader.setSpacingAfter(10);
                document.add(premiumHeader);

                List<ResolvedFeatureAccessResponse> features = premiumEntitlementService.resolveFamilyFeatures(family.getId());
                
                PdfPTable premiumTable = new PdfPTable(3);
                premiumTable.setWidthPercentage(100);
                premiumTable.setWidths(new float[]{35f, 30f, 35f});

                addTableHeaderCell(premiumTable, "FEATURE SERVICE KEY", tableHeaderFont, bgOrangeLight, borderGray);
                addTableHeaderCell(premiumTable, "SERVICE STATUS", tableHeaderFont, bgOrangeLight, borderGray);
                addTableHeaderCell(premiumTable, "LICENSE EXPIRATION", tableHeaderFont, bgOrangeLight, borderGray);

                boolean premZebra = false;
                for (var f : features) {
                    java.awt.Color rowBg = premZebra ? bgLightGray : java.awt.Color.WHITE;
                    
                    String statusStr = f.enabled() ? "ACTIVE (ENABLED)" : "INACTIVE (DISABLED)";
                    Font statusFont = f.enabled() ? profilePdfBoldFont(10, new java.awt.Color(22, 163, 74))
                                                 : profilePdfRegularFont(10, lightGrayText);
                    
                    addTableCell(premiumTable, f.featureKey(), valueFont, rowBg, borderGray);
                    
                    PdfPCell statusCell = new PdfPCell(new Paragraph(statusStr, statusFont));
                    statusCell.setBackgroundColor(rowBg);
                    statusCell.setBorderColor(borderGray);
                    statusCell.setBorderWidth(0.5f);
                    statusCell.setPadding(8);
                    premiumTable.addCell(statusCell);

                    String expiresStr = f.expiresAt() != null ? f.expiresAt().toLocalDate().toString() : "Lifetime / Unlimited";
                    addTableCell(premiumTable, expiresStr, valueFont, rowBg, borderGray);
                    
                    premZebra = !premZebra;
                }
                document.add(premiumTable);
            }

            // 5. SECURITY & CONFIRMATION BLOCK
            String secTitle = family != null ? "4. DOCUMENT CONTROL & INTEGRITY" : "2. DOCUMENT CONTROL & INTEGRITY";
            Paragraph securityHeader = new Paragraph("\n" + secTitle, sectionFont);
            securityHeader.setSpacingBefore(20);
            securityHeader.setSpacingAfter(10);
            document.add(securityHeader);

            PdfPTable securityTable = new PdfPTable(1);
            securityTable.setWidthPercentage(100);
            PdfPCell secCell = new PdfPCell();
            secCell.setPadding(10);
            secCell.setBackgroundColor(bgLightGray);
            secCell.setBorderColor(borderGray);
            secCell.setBorderWidth(1f);
            
            Paragraph integrityText = new Paragraph("This profile overview contains verified database records as of " + LocalDate.now().toString() + ". " +
                    "To prevent identity theft and fraud, do not share this profile certificate with unauthorized parties. " +
                    "All microservices records are encrypted and protected by the Mom Super App Platform Security Gate.", subTitleFont);
            integrityText.setLeading(13);
            secCell.addElement(integrityText);
            securityTable.addCell(secCell);
            document.add(securityTable);

            // Spacer before footer
            Paragraph spacerFooter = new Paragraph("\n\n");
            spacerFooter.setLeading(20);
            document.add(spacerFooter);

            // 6. OFFICIAL FOOTER
            Paragraph footer = new Paragraph("Verified Secure Document • Generated automatically by Mom Super App Platform • Confidential", footerFont);
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);

            document.close();
        } catch (Exception ex) {
            log.error("Error occurred while generating Profile PDF: {}", ex.getMessage());
        }

        return out.toByteArray();
    }

    private static Font profilePdfRegularFont(float size, java.awt.Color color) {
        return profilePdfFont(PROFILE_PDF_REGULAR_FONT, FontFactory.HELVETICA, Font.NORMAL, size, color);
    }

    private static Font profilePdfBoldFont(float size, java.awt.Color color) {
        return profilePdfFont(PROFILE_PDF_BOLD_FONT, FontFactory.HELVETICA, Font.BOLD, size, color);
    }

    private static Font profilePdfItalicFont(float size, java.awt.Color color) {
        return profilePdfFont(PROFILE_PDF_ITALIC_FONT, FontFactory.HELVETICA, Font.ITALIC, size, color);
    }

    private static Font profilePdfFont(BaseFont baseFont, String fallbackFont, int fallbackStyle, float size, java.awt.Color color) {
        if (baseFont != null) {
            return new Font(baseFont, size, Font.NORMAL, color);
        }
        return FontFactory.getFont(fallbackFont, size, fallbackStyle, color);
    }

    private static BaseFont loadProfilePdfBaseFont(String propertyName, String envName, List<String> fallbackPaths) {
        BaseFont configuredFont = tryLoadProfilePdfBaseFont(System.getProperty(propertyName));
        if (configuredFont != null) {
            return configuredFont;
        }

        BaseFont envFont = tryLoadProfilePdfBaseFont(System.getenv(envName));
        if (envFont != null) {
            return envFont;
        }

        for (String fontPath : fallbackPaths) {
            BaseFont fallbackFont = tryLoadProfilePdfBaseFont(fontPath);
            if (fallbackFont != null) {
                return fallbackFont;
            }
        }

        log.warn("No Unicode profile PDF font found for {} / {}; falling back to standard PDF fonts.", propertyName, envName);
        return null;
    }

    private static BaseFont tryLoadProfilePdfBaseFont(String rawPath) {
        if (!StringUtils.hasText(rawPath)) {
            return null;
        }

        String fontPath = rawPath.trim();
        try {
            if (!Files.isRegularFile(Path.of(fontPath))) {
                return null;
            }
            return BaseFont.createFont(fontPath, BaseFont.IDENTITY_H, BaseFont.EMBEDDED);
        } catch (Exception ex) {
            log.warn("Unable to load profile PDF font from {}: {}", fontPath, ex.getMessage());
            return null;
        }
    }

    private void addCardField(PdfPTable table, String label, String value, Font lFont, Font vFont, java.awt.Color bg, java.awt.Color border) {
        PdfPCell cellLabel = new PdfPCell(new Paragraph(label, lFont));
        cellLabel.setBackgroundColor(bg);
        cellLabel.setBorderColor(border);
        cellLabel.setBorderWidth(0.5f);
        cellLabel.setPadding(8);
        table.addCell(cellLabel);

        PdfPCell cellVal = new PdfPCell(new Paragraph(value, vFont));
        cellVal.setBackgroundColor(bg);
        cellVal.setBorderColor(border);
        cellVal.setBorderWidth(0.5f);
        cellVal.setPadding(8);
        table.addCell(cellVal);
    }

    private void addTableHeaderCell(PdfPTable table, String text, Font font, java.awt.Color bg, java.awt.Color border) {
        PdfPCell cell = new PdfPCell(new Paragraph(text, font));
        cell.setBackgroundColor(bg);
        cell.setBorderColor(border);
        cell.setBorderWidth(0.5f);
        cell.setBorderWidthBottom(1.5f);
        cell.setPadding(8);
        table.addCell(cell);
    }

    private void addTableCell(PdfPTable table, String text, Font font, java.awt.Color bg, java.awt.Color border) {
        PdfPCell cell = new PdfPCell(new Paragraph(text, font));
        cell.setBackgroundColor(bg);
        cell.setBorderColor(border);
        cell.setBorderWidth(0.5f);
        cell.setPadding(8);
        table.addCell(cell);
    }

    private void ensureRequestAuthenticated() {
        if (UserContext.getUserId() == null) {
            throw new AccessDeniedException("Access denied: missing user context");
        }
    }
}
