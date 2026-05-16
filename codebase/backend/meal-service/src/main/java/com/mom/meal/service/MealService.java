package com.mom.meal.service;

import com.mom.common.exception.ResourceNotFoundException;
import com.mom.meal.controller.dto.CreateMealPlanRequest;
import com.mom.meal.controller.dto.CreateMealRequest;
import com.mom.meal.controller.dto.MealPlanResponse;
import com.mom.meal.controller.dto.MealResponse;
import com.mom.meal.controller.dto.UpdateMealRequest;
import com.mom.meal.controller.dto.UpdateMealPlanRequest;
import com.mom.meal.controller.dto.WeeklyMealPlanResponse;
import com.mom.meal.domain.MealEntity;
import com.mom.meal.domain.MealPlanEntity;
import com.mom.meal.event.MealEventPublisher;
import com.mom.meal.event.MealPlanCreatedPayload;
import com.mom.meal.repository.MealPlanRepository;
import com.mom.meal.repository.MealRepository;
import com.mom.common.security.DataIsolationUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import java.time.temporal.TemporalAdjusters;

@Service
@RequiredArgsConstructor
public class MealService {

    private final MealRepository mealRepository;
    private final MealPlanRepository mealPlanRepository;
    private final MealEventPublisher mealEventPublisher;

    @Transactional
    @CacheEvict(value = "meal-plan-today", allEntries = true)
    public MealResponse createMeal(CreateMealRequest request) {
        DataIsolationUtil.validateFamilyAccess(request.familyId());
        
        if (mealRepository.existsByFamilyIdAndNameIgnoreCase(request.familyId(), request.name().trim())) {
            throw new IllegalArgumentException("Meal name already exists in this family");
        }

        MealEntity meal = new MealEntity();
        meal.setFamilyId(request.familyId());
        meal.setName(request.name().trim());
        meal.setMealType(request.mealType());
        meal.setDescription(trimToNull(request.description()));
        return toMealResponse(mealRepository.save(meal));
    }

    public List<MealResponse> getMeals(Long familyId) {
        DataIsolationUtil.validateFamilyAccess(familyId);
        
        return mealRepository.findByFamilyIdOrderByNameAsc(familyId).stream()
                .map(this::toMealResponse)
                .toList();
    }

    public MealResponse getMeal(Long mealId) {
        MealEntity meal = mealRepository.findById(mealId)
                .orElseThrow(() -> new ResourceNotFoundException("Meal not found"));
        
        DataIsolationUtil.validateFamilyAccess(meal.getFamilyId());
        
        return toMealResponse(meal);
    }

    @Transactional
    @CacheEvict(value = "meal-plan-today", allEntries = true)
    public MealResponse updateMeal(Long mealId, UpdateMealRequest request) {
        MealEntity meal = mealRepository.findById(mealId)
                .orElseThrow(() -> new ResourceNotFoundException("Meal not found"));

        DataIsolationUtil.validateFamilyAccess(meal.getFamilyId());

        if (request.name() != null) {
            String normalizedName = request.name().trim();
            if (mealRepository.existsByFamilyIdAndNameIgnoreCaseAndIdNot(
                    meal.getFamilyId(),
                    normalizedName,
                    meal.getId()
            )) {
                throw new IllegalArgumentException("Meal name already exists in this family");
            }
            meal.setName(normalizedName);
        }
        if (request.mealType() != null) {
            meal.setMealType(request.mealType());
        }
        if (request.description() != null) {
            meal.setDescription(trimToNull(request.description()));
        }

        return toMealResponse(mealRepository.save(meal));
    }

    @Transactional
    @CacheEvict(value = "meal-plan-today", allEntries = true)
    public void deleteMeal(Long mealId) {
        MealEntity meal = mealRepository.findById(mealId)
                .orElseThrow(() -> new ResourceNotFoundException("Meal not found"));
        
        DataIsolationUtil.validateFamilyAccess(meal.getFamilyId());
        
        if (mealPlanRepository.existsByMealId(mealId)) {
            throw new IllegalArgumentException("Cannot delete meal because it is used in meal plans");
        }
        mealRepository.delete(meal);
    }

    @Transactional
    @CacheEvict(value = "meal-plan-today", allEntries = true)
    public MealPlanResponse createMealPlan(CreateMealPlanRequest request) {
        DataIsolationUtil.validateFamilyAccess(request.familyId());
        
        MealEntity meal = mealRepository.findById(request.mealId())
                .orElseThrow(() -> new ResourceNotFoundException("Meal not found"));
        if (!meal.getFamilyId().equals(request.familyId())) {
            throw new IllegalArgumentException("Meal does not belong to this family");
        }
        if (mealPlanRepository.existsByFamilyIdAndMealIdAndPlanDate(
                request.familyId(),
                request.mealId(),
                request.planDate()
        )) {
            throw new IllegalArgumentException("Meal plan already exists for this meal and date");
        }

        MealPlanEntity plan = new MealPlanEntity();
        plan.setFamilyId(request.familyId());
        plan.setMealId(request.mealId());
        plan.setPlanDate(request.planDate());
        plan.setNotes(trimToNull(request.notes()));
        MealPlanEntity saved = mealPlanRepository.save(plan);

        mealEventPublisher.publishMealPlanCreated(new MealPlanCreatedPayload(
                saved.getId(),
                saved.getFamilyId(),
                saved.getMealId(),
                meal.getName(),
                saved.getPlanDate(),
                saved.getNotes()
        ));
        return toMealPlanResponse(saved, meal.getName());
    }

    public List<MealPlanResponse> getMealPlans(Long familyId, LocalDate from, LocalDate to) {
        DataIsolationUtil.validateFamilyAccess(familyId);
        
        List<MealPlanEntity> plans;
        if (from == null && to == null) {
            plans = mealPlanRepository.findByFamilyIdOrderByPlanDateDescCreatedAtDesc(familyId);
        } else {
            LocalDate start = from != null ? from : to;
            LocalDate end = to != null ? to : from;
            if (start == null || end == null) {
                throw new IllegalArgumentException("Invalid date range");
            }
            if (start.isAfter(end)) {
                throw new IllegalArgumentException("from date must be less than or equal to to date");
            }
            plans = mealPlanRepository.findByFamilyIdAndPlanDateBetweenOrderByPlanDateAscCreatedAtDesc(familyId, start, end);
        }

        Map<Long, String> mealNames = loadMealNames(plans);
        return plans.stream()
                .map(plan -> toMealPlanResponse(plan, mealNames.getOrDefault(plan.getMealId(), "Unknown")))
                .toList();
    }

    @Cacheable(value = "meal-plan-today", key = "#familyId")
    public List<MealPlanResponse> getTodayPlans(Long familyId) {
        DataIsolationUtil.validateFamilyAccess(familyId);
        
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        List<MealPlanEntity> plans = mealPlanRepository.findByFamilyIdAndPlanDateOrderByCreatedAtDesc(familyId, today);
        Map<Long, String> mealNames = loadMealNames(plans);
        return plans.stream()
                .map(plan -> toMealPlanResponse(plan, mealNames.getOrDefault(plan.getMealId(), "Unknown")))
                .toList();
    }

    public WeeklyMealPlanResponse getWeeklyPlans(Long familyId, LocalDate date) {
        DataIsolationUtil.validateFamilyAccess(familyId);
        
        LocalDate referenceDate = date != null ? date : LocalDate.now(ZoneOffset.UTC);
        LocalDate weekStart = referenceDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd = weekStart.plusDays(6);
        List<MealPlanEntity> plans = mealPlanRepository.findByFamilyIdAndPlanDateBetweenOrderByPlanDateAscCreatedAtDesc(
                familyId,
                weekStart,
                weekEnd
        );
        Map<Long, String> mealNames = loadMealNames(plans);
        List<MealPlanResponse> planResponses = plans.stream()
                .map(plan -> toMealPlanResponse(plan, mealNames.getOrDefault(plan.getMealId(), "Unknown")))
                .toList();
        return new WeeklyMealPlanResponse(weekStart, weekEnd, planResponses);
    }

    @Transactional
    @CacheEvict(value = "meal-plan-today", allEntries = true)
    public MealPlanResponse updateMealPlan(Long mealPlanId, UpdateMealPlanRequest request) {
        MealPlanEntity plan = mealPlanRepository.findById(mealPlanId)
                .orElseThrow(() -> new ResourceNotFoundException("Meal plan not found"));

        DataIsolationUtil.validateFamilyAccess(plan.getFamilyId());

        Long targetMealId = request.mealId() != null ? request.mealId() : plan.getMealId();
        LocalDate targetPlanDate = request.planDate() != null ? request.planDate() : plan.getPlanDate();

        if (request.mealId() != null && !request.mealId().equals(plan.getMealId())) {
            MealEntity meal = mealRepository.findById(request.mealId())
                    .orElseThrow(() -> new ResourceNotFoundException("Meal not found"));
            if (!meal.getFamilyId().equals(plan.getFamilyId())) {
                throw new IllegalArgumentException("Meal does not belong to this family");
            }
            plan.setMealId(request.mealId());
        }
        if (request.planDate() != null) {
            plan.setPlanDate(request.planDate());
        }
        if (mealPlanRepository.existsByFamilyIdAndMealIdAndPlanDateAndIdNot(
                plan.getFamilyId(),
                targetMealId,
                targetPlanDate,
                plan.getId()
        )) {
            throw new IllegalArgumentException("Meal plan already exists for this meal and date");
        }
        if (request.notes() != null) {
            plan.setNotes(trimToNull(request.notes()));
        }

        MealPlanEntity saved = mealPlanRepository.save(plan);
        String mealName = mealRepository.findById(saved.getMealId())
                .map(MealEntity::getName)
                .orElse("Unknown");
        return toMealPlanResponse(saved, mealName);
    }

    @Transactional
    @CacheEvict(value = "meal-plan-today", allEntries = true)
    public void deleteMealPlan(Long mealPlanId) {
        MealPlanEntity plan = mealPlanRepository.findById(mealPlanId)
                .orElseThrow(() -> new ResourceNotFoundException("Meal plan not found"));
        
        DataIsolationUtil.validateFamilyAccess(plan.getFamilyId());
        
        mealPlanRepository.delete(plan);
    }

    private Map<Long, String> loadMealNames(List<MealPlanEntity> plans) {
        Set<Long> mealIds = plans.stream().map(MealPlanEntity::getMealId).collect(Collectors.toSet());
        return mealRepository.findAllById(mealIds).stream()
                .collect(Collectors.toMap(MealEntity::getId, MealEntity::getName));
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private MealResponse toMealResponse(MealEntity meal) {
        return new MealResponse(
                meal.getId(),
                meal.getFamilyId(),
                meal.getName(),
                meal.getMealType(),
                meal.getDescription()
        );
    }

    private MealPlanResponse toMealPlanResponse(MealPlanEntity plan, String mealName) {
        return new MealPlanResponse(
                plan.getId(),
                plan.getFamilyId(),
                plan.getMealId(),
                mealName,
                plan.getPlanDate(),
                plan.getNotes()
        );
    }
}
