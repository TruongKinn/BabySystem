package com.mom.meal.controller;

import com.mom.common.dto.ApiResponse;
import com.mom.meal.controller.dto.CreateMealPlanRequest;
import com.mom.meal.controller.dto.CreateMealRequest;
import com.mom.meal.controller.dto.MealPlanResponse;
import com.mom.meal.controller.dto.MealResponse;
import com.mom.meal.controller.dto.UpdateMealRequest;
import com.mom.meal.controller.dto.UpdateMealPlanRequest;
import com.mom.meal.controller.dto.WeeklyMealPlanResponse;
import com.mom.meal.service.MealService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MealController {

    private final MealService mealService;

    @PostMapping("/meals")
    public ApiResponse<MealResponse> createMeal(@Valid @RequestBody CreateMealRequest request) {
        return ApiResponse.ok("Meal created", mealService.createMeal(request));
    }

    @GetMapping("/meals")
    public ApiResponse<List<MealResponse>> getMeals(@RequestParam("familyId") Long familyId) {
        return ApiResponse.ok("Success", mealService.getMeals(familyId));
    }

    @GetMapping("/meals/{id}")
    public ApiResponse<MealResponse> getMeal(@PathVariable("id") Long mealId) {
        return ApiResponse.ok("Success", mealService.getMeal(mealId));
    }

    @PutMapping("/meals/{id}")
    public ApiResponse<MealResponse> updateMeal(
            @PathVariable("id") Long mealId,
            @Valid @RequestBody UpdateMealRequest request
    ) {
        return ApiResponse.ok("Meal updated", mealService.updateMeal(mealId, request));
    }

    @DeleteMapping("/meals/{id}")
    public ApiResponse<Object> deleteMeal(@PathVariable("id") Long mealId) {
        mealService.deleteMeal(mealId);
        return ApiResponse.ok("Meal deleted", null);
    }

    @PostMapping("/meal-plans")
    public ApiResponse<MealPlanResponse> createMealPlan(@Valid @RequestBody CreateMealPlanRequest request) {
        return ApiResponse.ok("Meal plan created", mealService.createMealPlan(request));
    }

    @GetMapping("/meal-plans")
    public ApiResponse<List<MealPlanResponse>> getMealPlans(
            @RequestParam("familyId") Long familyId,
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ApiResponse.ok("Success", mealService.getMealPlans(familyId, from, to));
    }

    @GetMapping("/meal-plans/today")
    public ApiResponse<List<MealPlanResponse>> getTodayPlans(@RequestParam("familyId") Long familyId) {
        return ApiResponse.ok("Success", mealService.getTodayPlans(familyId));
    }

    @GetMapping("/meal-plans/weekly")
    public ApiResponse<WeeklyMealPlanResponse> getWeeklyPlans(
            @RequestParam("familyId") Long familyId,
            @RequestParam(value = "date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ApiResponse.ok("Success", mealService.getWeeklyPlans(familyId, date));
    }

    @PutMapping("/meal-plans/{id}")
    public ApiResponse<MealPlanResponse> updateMealPlan(
            @PathVariable("id") Long mealPlanId,
            @Valid @RequestBody UpdateMealPlanRequest request
    ) {
        return ApiResponse.ok("Meal plan updated", mealService.updateMealPlan(mealPlanId, request));
    }

    @DeleteMapping("/meal-plans/{id}")
    public ApiResponse<Object> deleteMealPlan(@PathVariable("id") Long mealPlanId) {
        mealService.deleteMealPlan(mealPlanId);
        return ApiResponse.ok("Meal plan deleted", null);
    }
}
