package com.mom.common.kafka;

public final class EventTopics {

    public static final String USER_CREATED = "user.created";
    public static final String FAMILY_CREATED = "family.created";
    public static final String EXPENSE_CREATED = "expense.created";
    public static final String EXPENSE_UPDATED = "expense.updated";
    public static final String EXPENSE_DELETED = "expense.deleted";
    public static final String MEAL_PLAN_CREATED = "meal.plan.created";
    public static final String BABY_LOG_CREATED = "baby.log.created";
    public static final String TASK_CREATED = "task.created";
    public static final String TASK_COMPLETED = "task.completed";
    public static final String NOTIFICATION_REQUESTED = "notification.requested";

    private EventTopics() {
    }
}
