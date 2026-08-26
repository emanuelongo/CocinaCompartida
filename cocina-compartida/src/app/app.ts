import { Component, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { Header } from './shared/components/header/header';
import { Footer } from './shared/components/footer/footer';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { KeepAliveService } from './shared/services/keep-alive.service';
import { ReadingAssistant } from './shared/components/reading-assistant/reading-assistant';
import { CookingChatbotComponent } from './shared/components/cooking-chatbot/cooking-chatbot.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, CommonModule, ReadingAssistant, CookingChatbotComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('cocina-compartida');

  showLayout = true; // controlar header/footer
  routeAnnouncement = '';

  constructor(
    private router: Router,
    private keepAlive: KeepAliveService,
  ) {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const currentUrl = event.url;
        const hideRoutes = ['/login', '/sign-up', '/recipe-upload', '/edit'];
        this.showLayout = !hideRoutes.some((r) => currentUrl.includes(r));
        window.setTimeout(() => {
          const main = document.getElementById('main-content');
          const heading = main?.querySelector('h1, h2')?.textContent?.trim();
          this.routeAnnouncement = heading ? `Página cargada: ${heading}` : 'Página cargada';
          main?.focus();
        });
      });
  }

  goBack(): void {
    window.history.back();
  }

  goForward(): void {
    window.history.forward();
  }
}