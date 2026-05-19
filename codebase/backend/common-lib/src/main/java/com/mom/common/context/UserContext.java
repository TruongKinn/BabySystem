package com.mom.common.context;

import java.util.List;

public class UserContext {
    private static final ThreadLocal<Long> userId = new ThreadLocal<>();
    private static final ThreadLocal<List<Long>> familyIds = new ThreadLocal<>();
    private static final ThreadLocal<Boolean> admin = new ThreadLocal<>();

    public static void setUserId(Long id) {
        userId.set(id);
    }

    public static Long getUserId() {
        return userId.get();
    }

    public static void setFamilyIds(List<Long> ids) {
        familyIds.set(ids);
    }

    public static List<Long> getFamilyIds() {
        return familyIds.get();
    }

    public static void setAdmin(Boolean isAdmin) {
        admin.set(isAdmin);
    }

    public static Boolean isAdmin() {
        return Boolean.TRUE.equals(admin.get());
    }

    public static void clear() {
        userId.remove();
        familyIds.remove();
        admin.remove();
    }
}
