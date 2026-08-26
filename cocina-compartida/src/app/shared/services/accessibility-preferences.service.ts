import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AccessibilityPreferences,
  DEFAULT_ACCESSIBILITY_PREFERENCES,
} from '../interfaces/accessibility-preferences';

@Injectable({ providedIn: 'root' })
export class AccessibilityPreferencesService {
  private readonly http = inject(HttpClient);
  private readonly storageKey = 'cocina-accessibility-preferences';
  private loaded = false;
  private loadedForToken: string | null | undefined;

  readonly preferences = signal<AccessibilityPreferences>(DEFAULT_ACCESSIBILITY_PREFERENCES);

  async load(): Promise<AccessibilityPreferences> {
    const token = localStorage.getItem('token');
    if (this.loaded && token === this.loadedForToken) return this.preferences();

    const local = this.readLocalPreferences();
    this.preferences.set(local);

    if (token) {
      try {
        const remote = await firstValueFrom(
          this.http.get<AccessibilityPreferences>('/api/users/me/accessibility'),
        );
        const normalized = this.normalize(remote);
        this.preferences.set(normalized);
        this.persistLocally(normalized);
      } catch {
        // La lectura sigue disponible con la configuración local si la API no responde.
      }
    }

    this.loaded = true;
    this.loadedForToken = token;
    return this.preferences();
  }

  async update(changes: Partial<AccessibilityPreferences>): Promise<AccessibilityPreferences> {
    const next = this.normalize({ ...this.preferences(), ...changes });
    this.preferences.set(next);
    this.persistLocally(next);

    if (localStorage.getItem('token')) {
      try {
        const remote = await firstValueFrom(
          this.http.patch<AccessibilityPreferences>('/api/users/me/accessibility', changes),
        );
        const normalized = this.normalize(remote);
        this.preferences.set(normalized);
        this.persistLocally(normalized);
      } catch {
        // Se conserva la preferencia local para no inutilizar el asistente.
      }
    }

    return this.preferences();
  }

  private readLocalPreferences(): AccessibilityPreferences {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored
        ? this.normalize(JSON.parse(stored) as Partial<AccessibilityPreferences>)
        : { ...DEFAULT_ACCESSIBILITY_PREFERENCES };
    } catch {
      return { ...DEFAULT_ACCESSIBILITY_PREFERENCES };
    }
  }

  private persistLocally(preferences: AccessibilityPreferences): void {
    localStorage.setItem(this.storageKey, JSON.stringify(preferences));
  }

  private normalize(value: Partial<AccessibilityPreferences>): AccessibilityPreferences {
    const rate = Number(value.speechRate);
    return {
      readingAssistantEnabled: value.readingAssistantEnabled === true,
      autoReadEnabled: value.autoReadEnabled === true,
      speechRate: Number.isFinite(rate) ? Math.min(2, Math.max(0.5, rate)) : 1,
      preferredVoice:
        typeof value.preferredVoice === 'string' && value.preferredVoice.trim()
          ? value.preferredVoice.trim().slice(0, 120)
          : null,
    };
  }
}