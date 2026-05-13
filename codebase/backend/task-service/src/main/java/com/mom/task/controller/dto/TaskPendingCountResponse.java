package com.mom.task.controller.dto;

import java.io.Serializable;

public record TaskPendingCountResponse(
        Long familyId,
        long pendingCount
) implements Serializable {

    private static final long serialVersionUID = 1L;
}
