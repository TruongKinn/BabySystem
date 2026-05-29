package com.mom.baby.service;

import com.mom.baby.controller.dto.CreateJourneyEventRequest;
import com.mom.baby.controller.dto.JourneyEventResponse;
import com.mom.baby.domain.JourneyEventEntity;
import com.mom.baby.premium.PremiumFeatures;
import com.mom.baby.repository.BabyRepository;
import com.mom.baby.repository.JourneyEventRepository;
import com.mom.common.exception.ResourceNotFoundException;
import com.mom.common.security.DataIsolationUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class JourneyEventService {

    private final JourneyEventRepository journeyEventRepository;
    private final BabyRepository babyRepository;
    private final PremiumAccessService premiumAccessService;

    @Transactional
    public JourneyEventResponse createEvent(Long babyId, CreateJourneyEventRequest request) {
        var baby = babyRepository.findById(babyId)
                .orElseThrow(() -> new ResourceNotFoundException("Baby not found"));
        DataIsolationUtil.validateFamilyAccess(baby.getFamilyId());
        premiumAccessService.requireFeature(baby.getFamilyId(), PremiumFeatures.BABY_JOURNEY_PLUS);

        JourneyEventEntity entity = new JourneyEventEntity();
        entity.setId(request.id());
        entity.setBabyId(babyId);
        entity.setTitle(request.title().trim());
        entity.setStory(request.story());
        entity.setHappenedAt(request.happenedAt());
        entity.setType(request.type());
        entity.setPrivacy(request.privacy());
        entity.setSource(request.source());
        entity.setSourceRef(request.sourceRef());
        entity.setCapsuleOpenAt(request.capsuleOpenAt());
        entity.setRecipient(request.recipient());
        entity.setCreatedAt(request.createdAt());
        entity.setCreatedBy(request.createdBy());

        return toResponse(journeyEventRepository.save(entity));
    }

    public List<JourneyEventResponse> getEvents(Long babyId) {
        var baby = babyRepository.findById(babyId)
                .orElseThrow(() -> new ResourceNotFoundException("Baby not found"));
        DataIsolationUtil.validateFamilyAccess(baby.getFamilyId());
        premiumAccessService.requireFeature(baby.getFamilyId(), PremiumFeatures.BABY_JOURNEY_PLUS);

        return journeyEventRepository.findByBabyIdOrderByHappenedAtDesc(babyId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public void deleteEvent(Long babyId, String eventId) {
        var baby = babyRepository.findById(babyId)
                .orElseThrow(() -> new ResourceNotFoundException("Baby not found"));
        DataIsolationUtil.validateFamilyAccess(baby.getFamilyId());

        if (!journeyEventRepository.existsByIdAndBabyId(eventId, babyId)) {
            throw new ResourceNotFoundException("Journey event not found");
        }
        journeyEventRepository.deleteById(eventId);
    }

    private JourneyEventResponse toResponse(JourneyEventEntity entity) {
        return new JourneyEventResponse(
                entity.getId(),
                entity.getBabyId(),
                entity.getTitle(),
                entity.getStory(),
                entity.getHappenedAt(),
                entity.getType(),
                entity.getPrivacy(),
                entity.getSource(),
                entity.getSourceRef(),
                entity.getCapsuleOpenAt(),
                entity.getRecipient(),
                entity.getCreatedAt(),
                entity.getCreatedBy()
        );
    }
}
