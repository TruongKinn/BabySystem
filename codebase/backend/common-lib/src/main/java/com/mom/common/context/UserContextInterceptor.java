package com.mom.common.context;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class UserContextInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String userIdStr = request.getHeader("X-User-Id");
        if (StringUtils.hasText(userIdStr)) {
            try {
                UserContext.setUserId(Long.parseLong(userIdStr));
            } catch (NumberFormatException ignored) {}
        }

        String familyIdsStr = request.getHeader("X-Family-Ids");
        if (StringUtils.hasText(familyIdsStr)) {
            List<Long> familyIds = Arrays.stream(familyIdsStr.split(","))
                    .map(String::trim)
                    .filter(StringUtils::hasText)
                    .map(Long::parseLong)
                    .collect(Collectors.toList());
            UserContext.setFamilyIds(familyIds);
        }

        String adminStr = request.getHeader("X-User-Admin");
        if (StringUtils.hasText(adminStr)) {
            UserContext.setAdmin(Boolean.parseBoolean(adminStr.trim()));
        }

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        UserContext.clear();
    }
}
