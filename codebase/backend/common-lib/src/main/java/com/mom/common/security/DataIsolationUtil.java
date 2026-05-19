package com.mom.common.security;

import com.mom.common.context.UserContext;
import lombok.experimental.UtilityClass;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;

@UtilityClass
public class DataIsolationUtil {

    public static void validateFamilyAccess(Long familyId) {
        if (familyId == null) {
            throw new IllegalArgumentException("familyId must not be null");
        }
        
        // Bypass data isolation for system administrators (ADMIN and OWNER)
        if (UserContext.isAdmin()) {
            return;
        }
        
        List<Long> allowedFamilyIds = UserContext.getFamilyIds();
        if (allowedFamilyIds == null || allowedFamilyIds.isEmpty()) {
            throw new AccessDeniedException("User is not associated with any family");
        }
        
        if (!allowedFamilyIds.contains(familyId)) {
            throw new AccessDeniedException("Access denied for familyId: " + familyId);
        }
    }
    
    public static void validateFamilyAccess(Iterable<Long> familyIds) {
        if (familyIds == null) {
            return;
        }
        for (Long id : familyIds) {
            validateFamilyAccess(id);
        }
    }
}
