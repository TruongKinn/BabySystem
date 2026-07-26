package com.mom.ai.controller;

import com.mom.ai.controller.dto.AiChatRequest;
import com.mom.ai.controller.dto.AiChatResponse;
import com.mom.ai.controller.dto.AiStatusResponse;
import com.mom.ai.controller.dto.OcrReceiptRequest;
import com.mom.ai.controller.dto.OcrReceiptResponse;
import com.mom.ai.controller.dto.OcrVaccinationRequest;
import com.mom.ai.controller.dto.OcrVaccinationResponse;
import com.mom.ai.controller.dto.SuggestMealsRequest;
import com.mom.ai.controller.dto.SuggestMealsResponse;
import com.mom.ai.controller.dto.GenerateTravelPlanRequest;
import com.mom.ai.controller.dto.GenerateTravelPlanResponse;
import com.mom.ai.service.FamilyCopilotService;
import com.mom.ai.service.UserAccessContext;
import com.mom.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/copilot")
@RequiredArgsConstructor
public class AiController {

    private final FamilyCopilotService familyCopilotService;

    @PostMapping("/chat")
    public ApiResponse<AiChatResponse> chat(
            @Valid @RequestBody AiChatRequest request,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestHeader(value = "X-Family-Ids", required = false) String familyIds,
            @RequestHeader(value = "X-User-Admin", required = false, defaultValue = "false") boolean admin
    ) {
        UserAccessContext accessContext = new UserAccessContext(userId, familyIds, admin);
        return ApiResponse.ok("Success", familyCopilotService.chat(request, accessContext));
    }

    @PostMapping("/ocr-receipt")
    public ApiResponse<OcrReceiptResponse> ocrReceipt(
            @Valid @RequestBody OcrReceiptRequest request,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestHeader(value = "X-Family-Ids", required = false) String familyIds,
            @RequestHeader(value = "X-User-Admin", required = false, defaultValue = "false") boolean admin
    ) {
        UserAccessContext accessContext = new UserAccessContext(userId, familyIds, admin);
        return ApiResponse.ok("OCR extraction complete", familyCopilotService.ocrReceipt(request, accessContext));
    }

    @PostMapping("/ocr-vaccinations")
    public ApiResponse<OcrVaccinationResponse> ocrVaccinations(
            @Valid @RequestBody OcrVaccinationRequest request,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestHeader(value = "X-Family-Ids", required = false) String familyIds,
            @RequestHeader(value = "X-User-Admin", required = false, defaultValue = "false") boolean admin
    ) {
        UserAccessContext accessContext = new UserAccessContext(userId, familyIds, admin);
        return ApiResponse.ok("Vaccination OCR extraction complete", familyCopilotService.ocrVaccinations(request, accessContext));
    }

    @PostMapping("/suggest-meals")
    public ApiResponse<SuggestMealsResponse> suggestMeals(
            @Valid @RequestBody SuggestMealsRequest request,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestHeader(value = "X-Family-Ids", required = false) String familyIds,
            @RequestHeader(value = "X-User-Admin", required = false, defaultValue = "false") boolean admin
    ) {
        UserAccessContext accessContext = new UserAccessContext(userId, familyIds, admin);
        return ApiResponse.ok("Success", familyCopilotService.suggestMeals(request, accessContext));
    }

    @PostMapping("/generate-travel-plan")
    public ApiResponse<GenerateTravelPlanResponse> generateTravelPlan(
            @Valid @RequestBody GenerateTravelPlanRequest request,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestHeader(value = "X-Family-Ids", required = false) String familyIds,
            @RequestHeader(value = "X-User-Admin", required = false, defaultValue = "false") boolean admin
    ) {
        UserAccessContext accessContext = new UserAccessContext(userId, familyIds, admin);
        return ApiResponse.ok("Travel plan generated successfully", familyCopilotService.generateTravelPlan(request, accessContext));
    }

    @GetMapping("/status")
    public ApiResponse<AiStatusResponse> status() {
        return ApiResponse.ok("Success", familyCopilotService.status());
    }
}
