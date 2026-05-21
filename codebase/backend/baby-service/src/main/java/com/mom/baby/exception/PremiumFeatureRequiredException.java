package com.mom.baby.exception;

import org.springframework.security.access.AccessDeniedException;

public class PremiumFeatureRequiredException extends AccessDeniedException {

    private final String featureKey;

    public PremiumFeatureRequiredException(String featureKey) {
        super("PREMIUM_REQUIRED:" + featureKey);
        this.featureKey = featureKey;
    }

    public String getFeatureKey() {
        return featureKey;
    }
}
