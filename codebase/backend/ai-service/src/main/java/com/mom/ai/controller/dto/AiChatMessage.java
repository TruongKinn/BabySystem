package com.mom.ai.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AiChatMessage(
        @NotBlank
        @Pattern(regexp = "user|assistant", message = "must be user or assistant")
        String role,

        @NotBlank
        @Size(max = 4000)
        String content
) {
}
