package com.mom.baby.controller.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateCommentRequest(
        @NotBlank
        @Size(max = 1000)
        String content,

        Long parentId,

        List<Long> taggedUserIds
) {
}
