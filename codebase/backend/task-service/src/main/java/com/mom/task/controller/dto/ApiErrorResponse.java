package com.mom.task.controller.dto;

import java.time.OffsetDateTime;

public record ApiErrorResponse(
        String code,
        int status,
        String message,
        String path,
        String traceId,
        OffsetDateTime timestamp
) {
}
