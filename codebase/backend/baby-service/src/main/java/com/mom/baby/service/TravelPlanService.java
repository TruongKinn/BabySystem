package com.mom.baby.service;

import com.mom.baby.domain.TravelPlanEntity;
import com.mom.baby.repository.TravelPlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TravelPlanService {

    private final TravelPlanRepository travelPlanRepository;

    @Transactional(readOnly = true)
    public List<TravelPlanEntity> getPlansByFamily(Long familyId) {
        return travelPlanRepository.findByFamilyIdOrderByStartDateAsc(familyId);
    }

    @Transactional
    public TravelPlanEntity createPlan(TravelPlanEntity plan) {
        // Gán ngược quan hệ cha-con trước khi save
        if (plan.getDestinations() != null) {
            plan.getDestinations().forEach(d -> d.setPlan(plan));
        }
        if (plan.getChecklist() != null) {
            plan.getChecklist().forEach(c -> c.setPlan(plan));
        }
        return travelPlanRepository.save(plan);
    }

    @Transactional
    public TravelPlanEntity updatePlan(String planId, TravelPlanEntity updatedPlan) {
        TravelPlanEntity existing = travelPlanRepository.findById(planId)
                .orElseThrow(() -> new IllegalArgumentException("Travel plan not found: " + planId));

        existing.setTitle(updatedPlan.getTitle());
        existing.setDescription(updatedPlan.getDescription());
        existing.setStartDate(updatedPlan.getStartDate());
        existing.setEndDate(updatedPlan.getEndDate());
        existing.setAiIdeas(updatedPlan.getAiIdeas());

        // Sử dụng các helper methods để Hibernate đồng bộ bộ sưu tập chính xác
        existing.setDestinations(updatedPlan.getDestinations());
        existing.setChecklist(updatedPlan.getChecklist());

        return travelPlanRepository.save(existing);
    }

    @Transactional
    public void deletePlan(String planId) {
        if (travelPlanRepository.existsById(planId)) {
            travelPlanRepository.deleteById(planId);
        }
    }
}
