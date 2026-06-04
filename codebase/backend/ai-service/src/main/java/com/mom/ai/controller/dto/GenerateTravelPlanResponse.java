package com.mom.ai.controller.dto;

import java.util.List;

public record GenerateTravelPlanResponse(
        String title,
        String description,
        List<AiDestination> destinations,
        List<AiChecklistItem> checklist
) {
    public record AiDestination(
            String name,
            Double lat,
            Double lng,
            Integer dayIndex,
            String notes
    ) {}

    public record AiChecklistItem(
            String task,
            String category
    ) {}
}
