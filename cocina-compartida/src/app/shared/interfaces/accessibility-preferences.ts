export interface AccessibilityPreferences {
  readingAssistantEnabled: boolean;
  autoReadEnabled: boolean;
  speechRate: number;
  preferredVoice: string | null;
}

export const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = {
  readingAssistantEnabled: false,
  autoReadEnabled: false,
  speechRate: 1,
  preferredVoice: null,
};