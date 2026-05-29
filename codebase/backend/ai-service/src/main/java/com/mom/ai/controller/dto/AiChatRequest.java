package com.mom.ai.controller.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.util.List;

public record AiChatRequest(
        @NotNull
        @Positive
        Long familyId,

        @NotBlank
        @Size(max = 4000)
        String message,

        @Size(max = 20)
        String locale,

        @Size(max = 12000)
        String context,

        @Size(max = 64)
        String previousResponseId,

        @Valid
        @Size(max = 12)
        List<AiChatMessage> history
) {
}
