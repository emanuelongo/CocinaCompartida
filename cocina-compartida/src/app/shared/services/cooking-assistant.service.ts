import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, throwError, of } from 'rxjs';

export interface AssistantMessage {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CookingAssistantService {

  // Coloca aquí tu API Key de Google Gemini (Google AI Studio) si deseas activar la IA
  private readonly API_KEY: string = '';

  private readonly API_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  constructor(private http: HttpClient) {}

  private readonly systemPrompt = `
Eres el asistente culinario de Cocina Compartida.

Tu función es ayudar a los usuarios con:

- recetas
- ingredientes
- sustituciones
- técnicas de cocina
- tiempos de cocción
- preparación de alimentos
- ideas para cocinar
- presentación de platos

Responde siempre en español.

Sé amigable, práctico y claro.

Si el usuario menciona ingredientes que tiene disponibles,
propón recetas utilizando esos ingredientes.

Si propone una receta, explica los ingredientes y los pasos.

Mantén las respuestas relativamente cortas porque aparecerán
dentro de un chatbot.

Utiliza emojis de manera moderada.

Si la pregunta no tiene relación con cocina, explica
amablemente que eres un asistente especializado en cocina.
`;

  generateResponse(userMessage: string): Observable<string> {
    // Si no hay API Key configurada, responder con un mensaje amigable sin generar error HTTP 403
    if (!this.API_KEY || this.API_KEY.trim() === '') {
      return of(
        '👨‍🍳 ¡Hola! El asistente culinario con IA está listo, pero requiere una clave de Google Gemini (API_KEY) para generar respuestas automáticas personalizadas.'
      );
    }

    const prompt = `
${this.systemPrompt}

El usuario pregunta:

${userMessage}
`;

    const body = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-goog-api-key': this.API_KEY.trim()
    });

    return this.http
      .post<any>(this.API_URL, body, { headers })
      .pipe(
        map(response => {
          const text =
            response?.candidates?.[0]?.content?.parts?.[0]?.text;

          if (!text) {
            throw new Error('Gemini no devolvió texto.');
          }

          return text;
        }),

        catchError(error => {
          console.error('========== GEMINI ERROR ==========');
          console.error('Status:', error?.status);
          console.error('Mensaje:', error?.message);
          console.error('Error completo:', error?.error);
          console.error('===================================');

          return throwError(() => error);
        })
      );
  }

  generateGreeting(): Observable<string> {
    // Si no hay API Key, retornar el saludo por defecto inmediatamente
    if (!this.API_KEY || this.API_KEY.trim() === '') {
      return of('👨‍🍳 ¡Hola! Soy tu asistente de Cocina Compartida. ¿Qué te gustaría cocinar o consultar hoy?');
    }

    return this.generateResponse(`
Saluda al usuario que acaba de abrir Cocina Compartida.

Haz un saludo corto, amigable y utiliza uno o dos emojis.

Termina preguntándole qué le gustaría cocinar o consultar.
`);
  }
}
