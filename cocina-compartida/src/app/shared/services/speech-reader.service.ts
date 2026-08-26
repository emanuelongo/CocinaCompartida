import { Injectable, signal } from '@angular/core';

export type ReaderState = 'idle' | 'reading' | 'paused';

@Injectable({ providedIn: 'root' })
export class SpeechReaderService {
  readonly state = signal<ReaderState>('idle');
  readonly status = signal('Asistente listo para leer.');
  readonly voices = signal<SpeechSynthesisVoice[]>([]);
  readonly supported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window;

  private readonly synth = this.supported ? window.speechSynthesis : null;
  private queue: string[] = [];
  private requestVersion = 0;

  initialize(): void {
    if (!this.synth) {
      this.status.set('Este navegador no ofrece síntesis de voz.');
      return;
    }

    this.loadVoices();
    this.synth.addEventListener('voiceschanged', () => this.loadVoices());
  }

  readPage(rate: number, preferredVoice: string | null): boolean {
    const text = this.extractReadableText();
    if (!text) {
      this.status.set('No encontré contenido legible en esta página.');
      return false;
    }
    this.readText(text, rate, preferredVoice);
    return true;
  }

  readText(text: string, rate: number, preferredVoice: string | null): void {
    if (!this.synth || !text.trim()) return;

    this.stop(false);
    const version = ++this.requestVersion;
    this.queue = this.splitIntoChunks(text);
    this.state.set('reading');
    this.status.set('Leyendo el contenido de la página.');
    this.speakNext(version, rate, preferredVoice);
  }

  pause(): void {
    if (!this.synth || this.state() !== 'reading') return;
    this.synth.pause();
    this.state.set('paused');
    this.status.set('Lectura pausada.');
  }

  resume(): void {
    if (!this.synth || this.state() !== 'paused') return;
    this.synth.resume();
    this.state.set('reading');
    this.status.set('Lectura reanudada.');
  }

  stop(announce = true): void {
    this.requestVersion += 1;
    this.queue = [];
    this.synth?.cancel();
    this.state.set('idle');
    if (announce) this.status.set('Lectura detenida.');
  }

  extractReadableText(root: ParentNode | null = document.querySelector('main')): string {
    const selection = window.getSelection?.()?.toString().trim();
    if (selection) return `Texto seleccionado. ${selection}`;
    if (!root) return '';

    const selectors = [
      'h1',
      'h2',
      'h3',
      'p',
      'li',
      'button',
      'a',
      'label',
      'legend',
      'input',
      'textarea',
      'select',
      'th',
      'td',
      '[data-readable]',
    ].join(',');

    const parts = Array.from(root.querySelectorAll<HTMLElement>(selectors))
      .filter((element) => !this.shouldIgnore(element))
      .map((element) => this.describeElement(element))
      .filter((text): text is string => Boolean(text));

    return [...new Set(parts)].join('. ');
  }

  private speakNext(version: number, rate: number, preferredVoice: string | null): void {
    if (!this.synth || version !== this.requestVersion) return;
    const next = this.queue.shift();
    if (!next) {
      this.state.set('idle');
      this.status.set('Lectura finalizada.');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(next);
    utterance.lang = 'es-CO';
    utterance.rate = Math.min(2, Math.max(0.5, Number(rate) || 1));
    utterance.voice = this.findVoice(preferredVoice);
    utterance.onend = () => this.speakNext(version, rate, preferredVoice);
    utterance.onerror = (event) => {
      if (version !== this.requestVersion || event.error === 'canceled') return;
      this.queue = [];
      this.state.set('idle');
      this.status.set('La lectura se interrumpió. Puedes intentarlo nuevamente.');
    };
    this.synth.speak(utterance);
  }

  private loadVoices(): void {
    const available = this.synth?.getVoices() ?? [];
    this.voices.set(
      [...available].sort((a, b) => {
        const aSpanish = a.lang.toLowerCase().startsWith('es') ? 0 : 1;
        const bSpanish = b.lang.toLowerCase().startsWith('es') ? 0 : 1;
        return aSpanish - bSpanish || a.name.localeCompare(b.name);
      }),
    );
  }

  private findVoice(preferredVoice: string | null): SpeechSynthesisVoice | null {
    const available = this.voices();
    return (
      available.find((voice) => voice.name === preferredVoice) ??
      available.find((voice) => voice.lang.toLowerCase() === 'es-co') ??
      available.find((voice) => voice.lang.toLowerCase().startsWith('es')) ??
      null
    );
  }

  private splitIntoChunks(text: string): string[] {
    const sentences = text
      .replace(/\s+/g, ' ')
      .trim()
      .split(/(?<=[.!?])\s+/);
    const chunks: string[] = [];

    for (const sentence of sentences) {
      if (sentence.length <= 220) {
        chunks.push(sentence);
        continue;
      }
      for (let index = 0; index < sentence.length; index += 220) {
        chunks.push(sentence.slice(index, index + 220));
      }
    }
    return chunks;
  }

  private shouldIgnore(element: HTMLElement): boolean {
    return Boolean(
      element.closest('[aria-hidden="true"], [hidden], [data-reader-ignore], .reading-assistant'),
    );
  }

  private describeElement(element: HTMLElement): string {
    const text = this.normalizeText(
      element.getAttribute('aria-label') ??
        (element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement
          ? (element.labels?.[0]?.textContent ?? element.getAttribute('placeholder') ?? '')
          : element.innerText || element.textContent || ''),
    );
    if (!text) return '';

    switch (element.tagName) {
      case 'H1':
        return `Título principal: ${text}`;
      case 'H2':
      case 'H3':
        return `Sección: ${text}`;
      case 'BUTTON':
        return `Botón: ${text}`;
      case 'A':
        return `Enlace: ${text}`;
      case 'INPUT':
      case 'TEXTAREA':
      case 'SELECT':
        return `Campo: ${text}`;
      default:
        return text;
    }
  }

  private normalizeText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }
}