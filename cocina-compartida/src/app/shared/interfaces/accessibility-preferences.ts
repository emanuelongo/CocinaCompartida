export interface AccessibilityPreferences {
  readingAssistantEnabled: boolean;
  autoReadEnabled: boolean;
  speechRate: number;
  preferredVoice: string | null;
  fontScale: number;
  highContrast: boolean;
}

export const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = {
  readingAssistantEnabled: false,
  autoReadEnabled: false,
  speechRate: 1,
  preferredVoice: null,
  fontScale: 1,
  highContrast: false,
};