export const FEATURES = {
  AUTH_ENABLED: false,
  MULTI_PROFILE_ENABLED: false,
  PWA_ENABLED: true,
  PUBLIC_SAAS_READY: true,
  FIREBASE_ADAPTER_ENABLED: false,
  QURAN_TEXT_ENABLED: true,
  MUSHAF_PAGES_ENABLED: true,
  NOTIFICATIONS_ENABLED: false,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export const LOCAL_USER_ID = 'local-user';
