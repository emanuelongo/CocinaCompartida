import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ScaledIngredientsResult } from '../interfaces/scaled-ingredients';

@Injectable({ providedIn: 'root' })
export class PortionScalingService {
  private readonly http = inject(HttpClient);

  scale(recipeId: string, servings: number): Promise<ScaledIngredientsResult> {
    return firstValueFrom(
      this.http.get<ScaledIngredientsResult>(`/api/recipes/${recipeId}/scaled-ingredients`, {
        params: { servings },
      }),
    );
  }
}