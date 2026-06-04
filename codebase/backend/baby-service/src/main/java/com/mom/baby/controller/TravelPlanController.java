package com.mom.baby.controller;

import com.mom.baby.domain.TravelPlanEntity;
import com.mom.baby.service.TravelPlanService;
import com.mom.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/travel-plans")
@RequiredArgsConstructor
public class TravelPlanController {

    private final TravelPlanService travelPlanService;

    @GetMapping("/family/{familyId}")
    public ApiResponse<List<TravelPlanEntity>> getPlans(@PathVariable Long familyId) {
        List<TravelPlanEntity> plans = travelPlanService.getPlansByFamily(familyId);
        return ApiResponse.ok("Success", plans);
    }

    @PostMapping
    public ApiResponse<TravelPlanEntity> createPlan(@RequestBody TravelPlanEntity plan) {
        TravelPlanEntity saved = travelPlanService.createPlan(plan);
        return ApiResponse.ok("Travel plan created", saved);
    }

    @PutMapping("/{planId}")
    public ApiResponse<TravelPlanEntity> updatePlan(
            @PathVariable String planId,
            @RequestBody TravelPlanEntity plan
    ) {
        TravelPlanEntity updated = travelPlanService.updatePlan(planId, plan);
        return ApiResponse.ok("Travel plan updated", updated);
    }

    @DeleteMapping("/{planId}")
    public ApiResponse<Object> deletePlan(@PathVariable String planId) {
        travelPlanService.deletePlan(planId);
        return ApiResponse.ok("Travel plan deleted", null);
    }
}
