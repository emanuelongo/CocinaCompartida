import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';
import { AccessibilityPreferencesService } from '../../services/accessibility-preferences.service';
import { SpeechReaderService } from '../../services/speech-reader.service';

@Component({
  selector: 'app-reading-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reading-assistant.html',
  styleUrl: './reading-assistant.css',
})
export class ReadingAssistant implements OnInit, OnDestroy {
  readonly reader = inject(SpeechReaderService);
  readonly preferencesService = inject(AccessibilityPreferencesService);
  private readonly router = inject(Router);
  private readonly destroyed = new Subject<void>();

  readonly expanded = signal(false);
  readonly saving = signal(false);
  readonly rateOptions = [0.75, 1, 1.25, 1.5, 2];

  async ngOnInit(): Promise<void> {
    this.reader.initialize();
    const preferences = await this.preferencesService.load();
    this.expanded.set(preferences.readingAssistantEnabled);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroyed),
      )
      .subscribe(() => void this.handleNavigation());
  }

  ngOnDestroy(): void {
    this.destroyed.next();
    this.destroyed.complete();
    this.reader.stop(false);
  }

  async open(): Promise<void> {
    this.expanded.set(true);
    await this.savePreference({ readingAssistantEnabled: true });
    this.reader.status.set('Asistente abierto. Usa Leer página para comenzar o Alt más R.');
  }

  async close(): Promise<void> {
    this.reader.stop(false);
    this.expanded.set(false);
    await this.savePreference({
      readingAssistantEnabled: false,
      autoReadEnabled: false,
    });
  }

  readPage(): void {
    const preferences = this.preferencesService.preferences();
    this.reader.readPage(preferences.speechRate, preferences.preferredVoice);
  }

  togglePause(): void {
    this.reader.state() === 'paused' ? this.reader.resume() : this.reader.pause();
  }

  async changeRate(rate: number): Promise<void> {
    await this.savePreference({ speechRate: Number(rate) });
    if (this.reader.state() !== 'idle') {
      this.reader.stop();
      this.reader.status.set('Velocidad actualizada. Inicia la lectura nuevamente.');
    }
  }

  async changeVoice(voice: string): Promise<void> {
    await this.savePreference({ preferredVoice: voice || null });
  }

  async changeAutoRead(enabled: boolean): Promise<void> {
    await this.savePreference({ autoReadEnabled: enabled });
    this.reader.status.set(
      enabled
        ? 'La lectura automática se aplicará al navegar a otra página.'
        : 'Lectura automática desactivada.',
    );
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcut(event: KeyboardEvent): void {
    if (event.altKey && event.key.toLowerCase() === 'l') {
      event.preventDefault();
      void (this.expanded() ? this.close() : this.open());
      return;
    }
    if (event.altKey && event.key.toLowerCase() === 'r' && this.expanded()) {
      event.preventDefault();
      this.readPage();
      return;
    }
    if (event.key === 'Escape' && this.reader.state() !== 'idle') {
      this.reader.stop();
    }
  }

  private async savePreference(
    changes: Parameters<AccessibilityPreferencesService['update']>[0],
  ): Promise<void> {
    this.saving.set(true);
    try {
      await this.preferencesService.update(changes);
    } finally {
      this.saving.set(false);
    }
  }

  private async handleNavigation(): Promise<void> {
    const current = await this.preferencesService.load();
    this.expanded.set(current.readingAssistantEnabled);
    if (!current.readingAssistantEnabled || !current.autoReadEnabled) return;
    window.setTimeout(() => this.reader.readPage(current.speechRate, current.preferredVoice), 500);
  }
}