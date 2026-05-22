export const PREMIUM_FEATURE_KEYS = {
  advancedGrowthTracking: 'advanced_growth_tracking',
  smartReminders: 'smart_reminders',
  aiCareAssistant: 'ai_care_assistant',
  premiumReports: 'premium_reports',
  familyCollaborationPlus: 'family_collaboration_plus',
  medicalVaultExport: 'medical_vault_export',
  unlimitedMemory: 'unlimited_memory',
  currencyExchange: 'currency_exchange'
} as const;

export type PremiumFeatureKey = typeof PREMIUM_FEATURE_KEYS[keyof typeof PREMIUM_FEATURE_KEYS];
