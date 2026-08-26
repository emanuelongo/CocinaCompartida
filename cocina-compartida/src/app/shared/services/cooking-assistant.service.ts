import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';

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

  private readonly API_KEY = 'AQUÍ SE PONE LA CLAVE DE API DE GOOGLE GEMINI';

  private readonly API_URL =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent';

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
      'x-goog-api-key': this.API_KEY
    });

    return this.http
      .post<any>(this.API_URL, body, { headers })
      .pipe(
        map(response => {

          console.log('Respuesta completa de Gemini:', response);

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

    return this.generateResponse(`
Saluda al usuario que acaba de abrir Cocina Compartida.

Haz un saludo corto, amigable y utiliza uno o dos emojis.

Termina preguntándole qué le gustaría cocinar o consultar.
`);
  }
}