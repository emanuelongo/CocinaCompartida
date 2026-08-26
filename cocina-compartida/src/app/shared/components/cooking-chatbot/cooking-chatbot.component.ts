import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CookingAssistantService,
  AssistantMessage
} from '../../services/cooking-assistant.service';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';

@Component({
  selector: 'app-cooking-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, SafeHtmlPipe],
  templateUrl: './cooking-chatbot.component.html',
  styleUrls: ['./cooking-chatbot.component.css']
})
export class CookingChatbotComponent implements OnInit {
  private assistantService = inject(CookingAssistantService);

  isOpen = false;
  messages: AssistantMessage[] = [];
  userInput = '';
  isLoading = false;

  ngOnInit() {
    this.loadGreeting();
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
  }

  loadGreeting() {
    this.assistantService.generateGreeting().subscribe({
      next: (greeting) => {
        this.messages.push({
          id: Math.random().toString(36),
          text: greeting,
          sender: 'assistant',
          timestamp: new Date()
        });

        this.scrollToBottom();
      },

      error: (error) => {
        console.error('Error generando saludo:', error);

        this.messages.push({
          id: Math.random().toString(36),
          text: '👨‍🍳 ¡Hola! Soy tu asistente de Cocina Compartida. ¿Qué te gustaría cocinar hoy?',
          sender: 'assistant',
          timestamp: new Date()
        });

        this.scrollToBottom();
      }
    });
  }

  sendMessage() {
    if (!this.userInput.trim() || this.isLoading) return;

    const message = this.userInput.trim();

    // Agregar mensaje del usuario
    this.messages.push({
      id: Math.random().toString(36),
      text: message,
      sender: 'user',
      timestamp: new Date()
    });

    this.userInput = '';
    this.isLoading = true;

    this.scrollToBottom();

    // Obtener respuesta de Gemini
    this.assistantService.generateResponse(message).subscribe({
      next: (response) => {
        this.messages.push({
          id: Math.random().toString(36),
          text: response,
          sender: 'assistant',
          timestamp: new Date()
        });

        this.isLoading = false;
        this.scrollToBottom();
      },

      error: (error) => {
        console.error('Error:', error);

        this.messages.push({
          id: Math.random().toString(36),
          text: '👨‍🍳 Lo siento, ocurrió un problema. Inténtalo nuevamente.',
          sender: 'assistant',
          timestamp: new Date()
        });

        this.isLoading = false;
        this.scrollToBottom();
      }
    });
  } // ← ESTE era el } que faltaba

  private scrollToBottom() {
    setTimeout(() => {
      const messagesContainer =
        document.querySelector('.chat-messages');

      if (messagesContainer) {
        messagesContainer.scrollTop =
          messagesContainer.scrollHeight;
      }
    }, 0);
  }

  onKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}