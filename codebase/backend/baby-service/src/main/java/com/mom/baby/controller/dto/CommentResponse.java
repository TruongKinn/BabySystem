package com.mom.baby.controller.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

public record CommentResponse(
        Long id,
        Long babyLogId,
        Long userId,
        String content,
        OffsetDateTime createdAt,
        Long parentId,
        List<CommentResponse> replies,
        Map<String, Long> reactionCounts,
        String myReaction
) {
}
