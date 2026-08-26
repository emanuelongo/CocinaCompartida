import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CookingExperience, CreateCookingExperience } from '../interfaces/cooking-experience';

@Injectable({ providedIn: 'root' })
export class CookingJournalService {
  private readonly http = inject(HttpClient);

  create(recipeId: string, payload: CreateCookingExperience): Promise<CookingExperience> {
    const formData = new FormData();
    formData.append('rating', String(payload.rating));
    formData.append('preparationNotes', payload.preparationNotes);
    formData.append('ingredientChanges', payload.ingredientChanges);
    formData.append('recommendations', payload.recommendations);
    if (payload.photo) {
      formData.append('photo', payload.photo);
    }

    return firstValueFrom(
      this.http.post<CookingExperience>(`/api/recipes/${recipeId}/experiences`, formData),
    );
  }

  getMine(): Promise<CookingExperience[]> {
    return firstValueFrom(this.http.get<CookingExperience[]>('/api/cooking-experiences/me'));
  }

  getMineByRecipe(recipeId: string): Promise<CookingExperience[]> {
    return firstValueFrom(
      this.http.get<CookingExperience[]>(`/api/recipes/${recipeId}/experiences/me`),
    );
  }

  remove(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`/api/cooking-experiences/${id}`));
  }
}