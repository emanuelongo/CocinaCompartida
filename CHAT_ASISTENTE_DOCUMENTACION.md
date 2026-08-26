# 👨‍🍳 Chat Asistente de Cocina - Mockup

## Descripción

Componente Angular **standalone** que implementa un asistente de cocina conversacional como una burbuja flotante en la esquina inferior derecha de la pantalla.

## 🎯 Características Principales

### 1. **Interfaz Flotante**
- Burbuja redonda en la esquina inferior derecha (fixed position)
- Animación suave de aparición/desaparición
- Responsive (se adapta a móviles)
- Z-index: 9999 (siempre visible)

### 2. **Chat Conversacional**
El asistente responde a 4 categorías de preguntas:

| Categoría | Ejemplos de Preguntas | Tipos de Respuesta |
|-----------|----------------------|-------------------|
| **Técnicas** | "¿Cómo sellar una carne?", "técnicas de cocina" | Guías paso a paso con emojis |
| **Ingredientes** | "No tengo mantequilla", "sustitutos", "alternativas" | Sustituciones inteligentes |
| **Qué Cocinar** | "Tengo pollo y tomate", "ingredientes X", "qué cocinar" | Sugerencias de recetas |
| **Presentación** | "¿Cómo presentar?", "decoración", "plato bonito" | Consejos de plating y design |

### 3. **Componentes Simulados**
- Mensajes del usuario (alineados a la derecha, fondo naranja)
- Mensajes del asistente (alineados a la izquierda, fondo blanco)
- Indicador de escritura (3 puntos animados)
- Timestamps en cada mensaje
- Desplazamiento automático al nuevo mensaje

## 📁 Estructura de Archivos

```
src/app/shared/
├── services/
│   └── cooking-assistant.service.ts    # Lógica de respuestas
├── components/
│   └── cooking-chatbot/
│       ├── cooking-chatbot.component.ts
│       ├── cooking-chatbot.component.html
│       └── cooking-chatbot.component.css
└── pipes/
    └── safe-html.pipe.ts                # Renderizar HTML en mensajes
```

## 🚀 Cómo Usar

### 1. **En la Aplicación (Ya Integrado)**
El componente está agregado en `app.ts` e `app.html`, así que aparece automáticamente en todas las páginas.

```typescript
// app.ts
imports: [..., CookingChatbotComponent]

// app.html
<app-cooking-chatbot></app-cooking-chatbot>
```

### 2. **Interacción Básica**
- Haz clic en la burbuja naranja para abrir/cerrar
- Escribe tu pregunta
- Presiona Enter o haz clic en el botón de enviar (📤)
- El asistente responderá en 1-2 segundos

## 🎨 Estilos y Temas

### Colores Base
- **Gradiente Principal**: `#FF6B6B` → `#FF8E5F` (naranja-rojo)
- **Fondo Chat**: `#f8f9fa` (gris claro)
- **Contraste**: Mensajes del usuario en naranja, del asistente en blanco

### Animaciones
- **Pulse**: Botón flotante pulsa suavemente
- **MessageIn**: Los mensajes aparecen con fade + slide-up
- **Typing**: Puntos animados para indicador de escritura

## 🔧 Personalización

### Cambiar Respuestas del Asistente
Edita `cooking-assistant.service.ts`:

```typescript
private responses = {
  'técnica': [
    '🔥 Tu respuesta personalizada aquí...',
    // más respuestas
  ],
  // otras categorías
};
```

### Cambiar Colores
En `cooking-chatbot.component.css`:

```css
/* Busca los gradientes y reemplaza los códigos hex */
background: linear-gradient(135deg, #FF6B6B 0%, #FF8E5F 100%);
/* Cambia a tus colores */
background: linear-gradient(135deg, #YOUR_COLOR1 0%, #YOUR_COLOR2 100%);
```

### Ajustar Tiempo de Respuesta
En `cooking-assistant.service.ts`:

```typescript
return of(randomResponse).pipe(delay(1500)); // 1500ms = 1.5 segundos
```

## 🔮 Mejoras Futuras para Producción

### Fase 1: Integración IA Real
```typescript
// Reemplazar Math.random() con llamadas a API
async generateResponse(userMessage: string): Observable<string> {
  const response = await fetch('/api/cooking-assistant', {
    method: 'POST',
    body: JSON.stringify({ message: userMessage })
  });
  return of(await response.json());
}
```

### Fase 2: Opciones de Integración IA
1. **Groq API** (ya existe en el proyecto)
   ```typescript
   import { GroqClient } from 'your-groq-service';
   ```

2. **Gemini API**
   ```typescript
   import { GeminiClient } from 'your-gemini-service';
   ```

3. **OpenAI GPT**
   ```typescript
   import { OpenAIClient } from 'your-openai-service';
   ```

### Fase 3: Características Avanzadas
- [ ] Historial persistente de conversaciones (localStorage)
- [ ] Exportar recetas recomendadas a la lista de favoritos
- [ ] Análisis de ingredientes con foto (OCR)
- [ ] Recomendaciones basadas en historial de recetas del usuario
- [ ] Integración con carrito de compras
- [ ] Multi-idioma
- [ ] Temas (dark mode / light mode)
- [ ] Tipeo simulado (typewriter effect)

### Fase 4: Analytics
```typescript
// Tracking de interacciones
this.analyticsService.trackChatMessage({
  timestamp: new Date(),
  category: 'técnicas',
  userMessage: message,
  assistantResponse: response
});
```

## 📊 Comportamiento Actual (Simulado)

```
┌─────────────────────────────────┐
│  👨‍🍳 Asistente de Cocina        │
│  Estoy aquí para ayudarte       │
├─────────────────────────────────┤
│                                 │
│  [Assistant]: ¡Hola! ¿En qué   │
│  puedo ayudarte?               │
│                                 │
│                [User]: ¿Cómo   │
│                sellar carne?   │
│                                 │
│  [Assistant]: 🔥 Para sellar... │
│                                 │
├─────────────────────────────────┤
│ [Input] Pregunta algo...    📤  │
├─────────────────────────────────┤
│ 💡 Prueba: técnicas, ingredientes│
└─────────────────────────────────┘
```

## 🧪 Testing Manual

1. **Abre la aplicación**: El chat debería aparecer en la esquina inferior derecha
2. **Haz clic en la burbuja**: La ventana debería animarse
3. **Escribe estas preguntas**:
   - "¿Cómo cocinar pasta al dente?"
   - "No tengo limón, ¿qué puedo usar?"
   - "Tengo pollo, tomate y arroz"
   - "¿Consejos para presentar un plato?"
4. **Verifica**: Los mensajes deberían aparecer con timestamps

## 🐛 Solución de Problemas

| Problema | Causa | Solución |
|----------|-------|----------|
| Chat no aparece | No está importado en app.ts | Verifica imports en app.ts |
| Mensajes no se desplazan | scrollToBottom() no funciona | Verifica que .chat-messages existe |
| Estilos rotos | CSS no cargado | Verifica la ruta de styleUrls |
| Input no responde | FormsModule no importado | Agrega FormsModule a imports |

## 📝 Notas de Desarrollo

- ✅ **Accesibilidad**: Input tiene label para screen readers
- ✅ **Responsive**: Se adapta a móviles (media queries incluidas)
- ✅ **Standalone**: Componente independiente, se puede reusar
- ✅ **Performance**: Animaciones CSS (no JavaScript)
- ⚠️ **Simulado**: Las respuestas son hardcoded, necesita integración IA real

## 🎓 Ejemplo de Extensión: Guardar Conversación

```typescript
// Guardar en localStorage
saveConversation() {
  const conversation = {
    messages: this.messages,
    timestamp: new Date(),
    category: 'cooking-assistant'
  };
  localStorage.setItem('cooking-chat-history', JSON.stringify(conversation));
}

// Cargar en ngOnInit
loadConversation() {
  const saved = localStorage.getItem('cooking-chat-history');
  if (saved) {
    this.messages = JSON.parse(saved).messages;
  }
}
```

---

**Creado**: 2026-08-17  
**Versión**: 1.0 (Mockup/Prototipo)  
**Estado**: 🟡 Listo para testing | Pendiente integración IA real
