package com.mom.task.controller.dto;

public record TaskOverviewResponse(
        Long familyId,
        long totalTasks,
        long pendingTasks,
        long inProgressTasks,
        long doneTasks,
        long overdueTasks,
        long dueTodayTasks,
        long unassignedTasks,
        double completionRate
) {
}
