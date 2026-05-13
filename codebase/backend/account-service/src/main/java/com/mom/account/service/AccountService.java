package com.mom.account.service;

import com.mom.account.controller.dto.AddFamilyMemberRequest;
import com.mom.account.controller.dto.CreateFamilyRequest;
import com.mom.account.controller.dto.CreateUserRequest;
import com.mom.account.controller.dto.FamilyMemberResponse;
import com.mom.account.controller.dto.FamilyResponse;
import com.mom.account.controller.dto.UserResponse;
import com.mom.account.domain.FamilyEntity;
import com.mom.account.domain.FamilyMemberEntity;
import com.mom.account.domain.FamilyRole;
import com.mom.account.domain.UserEntity;
import com.mom.account.event.AccountEventPublisher;
import com.mom.account.event.FamilyCreatedPayload;
import com.mom.account.event.UserCreatedPayload;
import com.mom.account.repository.FamilyMemberRepository;
import com.mom.account.repository.FamilyRepository;
import com.mom.account.repository.UserRepository;
import com.mom.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final UserRepository userRepository;
    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final AccountEventPublisher accountEventPublisher;

    @Transactional
    public UserResponse createUser(CreateUserRequest request) {
        userRepository.findByUsername(request.username()).ifPresent(existing -> {
            throw new IllegalArgumentException("Username already exists");
        });

        UserEntity user = new UserEntity();
        user.setUsername(request.username().trim());
        user.setEmail(request.email().trim().toLowerCase());
        user.setDisplayName(request.displayName().trim());
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
        familyMemberRepository.save(ownerMember);
        accountEventPublisher.publishFamilyCreated(new FamilyCreatedPayload(
                savedFamily.getId(),
                savedFamily.getName(),
                savedFamily.getCreatedByUserId()
        ));

        return getFamily(savedFamily.getId());
    }

    @Transactional
    public FamilyResponse addMember(Long familyId, AddFamilyMemberRequest request) {
        familyRepository.findById(familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Family not found"));
        userRepository.findById(request.userId())
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
        familyMemberRepository.save(member);

        return getFamily(familyId);
    }

    public FamilyResponse getFamily(Long familyId) {
        FamilyEntity family = familyRepository.findById(familyId)
                .orElseThrow(() -> new ResourceNotFoundException("Family not found"));
        List<FamilyMemberResponse> members = familyMemberRepository.findByFamilyId(familyId).stream()
                .map(member -> {
                    String displayName = userRepository.findById(member.getUserId())
                            .map(UserEntity::getDisplayName)
                            .orElse("Unknown");
                    return new FamilyMemberResponse(member.getUserId(), displayName, member.getRole());
                })
                .toList();
        return new FamilyResponse(family.getId(), family.getName(), family.getCreatedByUserId(), members);
    }

    private UserResponse toUserResponse(UserEntity user) {
        return new UserResponse(user.getId(), user.getUsername(), user.getEmail(), user.getDisplayName());
    }
}
