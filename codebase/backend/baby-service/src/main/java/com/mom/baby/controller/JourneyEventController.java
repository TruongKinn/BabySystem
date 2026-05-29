package com.mom.baby.controller;

import com.mom.baby.controller.dto.CreateJourneyEventRequest;
import com.mom.baby.controller.dto.JourneyEventResponse;
import com.mom.baby.service.JourneyEventService;
import com.mom.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class JourneyEventController {

    private final JourneyEventService journeyEventService;

    @PostMapping("/babies/{babyId}/journey-events")
    public ApiResponse<JourneyEventResponse> createEvent(
            @PathVariable Long babyId,
            @Valid @RequestBody CreateJourneyEventRequest request
    ) {
        return ApiResponse.ok("Journey event created", journeyEventService.createEvent(babyId, request));
    }

    @GetMapping("/babies/{babyId}/journey-events")
    public ApiResponse<List<JourneyEventResponse>> getEvents(@PathVariable Long babyId) {
        return ApiResponse.ok("Success", journeyEventService.getEvents(babyId));
    }

    @DeleteMapping("/babies/{babyId}/journey-events/{eventId}")
    public ApiResponse<Object> deleteEvent(
            @PathVariable Long babyId,
            @PathVariable String eventId
    ) {
        journeyEventService.deleteEvent(babyId, eventId);
        return ApiResponse.ok("Journey event deleted", null);
    }
}
