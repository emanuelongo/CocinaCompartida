import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Recipe } from '../interfaces/recipe';
import { RecipeStateService } from './recipe-state.service';

@Injectable({
  providedIn: 'root',
})
export class RecipeCrudService {
  private http = inject(HttpClient);
  private state = inject(RecipeStateService);

  async loadRecipes(): Promise<void> {
    this.state.setLoading(true);
    this.state.clearError();

    try {
      const data = await firstValueFrom(this.http.get<Recipe[]>(this.state.recipesUrl));
      this.state.setRecipes(data);
    } catch (error) {
      console.error('loadRecipes error', error);
      this.state.setError('No se pudieron cargar las recetas');
    } finally {
      this.state.setLoading(false);
    }
  }

  async loadTopLikedRecipes(): Promise<Recipe[]> {
    try {
      return await firstValueFrom(this.http.get<Recipe[]>(`${this.state.recipesUrl}/top-liked`));
    } catch (error) {
      console.error('loadTopLikedRecipes error', error);
      return [];
    }
  }

  async getRecipeById(recipeId: string): Promise<Recipe | null> {
    this.state.setLoading(true);
    this.state.clearError();

    try {
      return await firstValueFrom(this.http.get<Recipe>(this.state.getRecipeUrl(recipeId)));
    } catch (error) {
      console.error('getRecipeById error', error);
      this.state.setError('No se pudo encontrar la receta');
      return null;
    } finally {
      this.state.setLoading(false);
    }
  }

  async createRecipe(
    recipeInput: Omit<Recipe, 'id' | 'likes' | 'likedBy' | 'comments' | 'user'> & {
      images?: string[];
    },
  ): Promise<Recipe | null> {
    try {
      const payload = this.prepareRecipePayload(recipeInput);
      const created = await firstValueFrom(
        this.http.post<Recipe>(this.state.recipesUrl, payload, this.state.getAuthOptions()),
      );

      this.state.updateRecipes((list) => [created, ...list]);
      return created;
    } catch (error) {
      console.error('createRecipe error', error);
      this.state.setError('No se pudo crear la receta');
      return null;
    }
  }

  async updateRecipe(recipeId: string, changes: Partial<Recipe>): Promise<Recipe | null> {
    const previousState = this.state.recipes();

    this.applyOptimisticUpdate(recipeId, changes);
    const formattedChanges = { ...changes };
    if (formattedChanges.ingredients) {
      formattedChanges.ingredients = (formattedChanges.ingredients as any[]).map((item) => {
        if (typeof item === 'object' && item !== null) {
          return JSON.stringify(item);
        }
        return String(item);
      });
    }

    try {
      const updated = await firstValueFrom(
        this.http.patch<Recipe>(
          this.state.getRecipeUrl(recipeId),
          formattedChanges,
          this.state.getAuthOptions(),
        ),
      );

      this.state.updateRecipes((list) => list.map((r) => (r.id === recipeId ? updated : r)));
      return updated;
    } catch (error) {
      console.error('updateRecipe error', error);
      this.state.rollbackRecipes(previousState);
      this.state.setError('No se pudo actualizar la receta');
      return null;
    }
  }

  async deleteRecipe(recipeId: string): Promise<boolean> {
    const previousState = this.state.recipes();
    this.state.updateRecipes((list) => list.filter((r) => r.id !== recipeId));

    try {
      await firstValueFrom(
        this.http.delete<void>(this.state.getRecipeUrl(recipeId), this.state.getAuthOptions()),
      );
      return true;
    } catch (error) {
      console.error('deleteRecipe error', error);
      this.state.rollbackRecipes(previousState);
      this.state.setError('No se pudo eliminar la receta');
      return false;
    }
  }

  async downloadPDF(recipeId: string): Promise<void> {
    try {
      const url = `${this.state.getRecipeUrl(recipeId)}/download?format=pdf`;
      const response = await firstValueFrom(
        this.http.get(url, { responseType: 'blob', ...this.state.getAuthOptions() }),
      );
      this.triggerDownload(response, 'receta.pdf');
    } catch (error) {
      console.error('downloadPDF error', error);
      this.state.setError('No se pudo descargar el PDF');
    }
  }

  async downloadImage(recipeId: string): Promise<void> {
    try {
      const url = `${this.state.getRecipeUrl(recipeId)}/download?format=image`;
      const response = await firstValueFrom(
        this.http.get(url, { responseType: 'blob', ...this.state.getAuthOptions() }),
      );
      this.triggerDownload(response, 'receta.jpg');
    } catch (error) {
      console.error('downloadImage error', error);
      this.state.setError('No se pudo descargar la imagen');
    }
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  private prepareRecipePayload(
    recipeInput: Omit<Recipe, 'id' | 'likes' | 'likedBy' | 'comments' | 'user'> & {
      images?: string[];
      category?: string;
      servings?: number;
    }
  ) {
    return {
      name: recipeInput.name?.trim(),
      descripcion: recipeInput.descripcion?.trim(),
      servings: recipeInput.servings ?? 2,
      category: recipeInput.category,
      ingredients: (recipeInput.ingredients ?? []).map((item: any) => {
        if (typeof item === 'object' && item !== null) {
          return JSON.stringify(item);
        }
        return String(item);
      }),
      steps: recipeInput.steps ?? [],
      images: recipeInput.images ?? [],
    };
  }

  private applyOptimisticUpdate(recipeId: string, changes: Partial<Recipe>): void {
    this.state.updateRecipes((list) =>
      list.map((r) => (r.id === recipeId ? ({ ...r, ...changes } as Recipe) : r)),
    );
  }
}