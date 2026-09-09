import { Injectable, inject } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { RecipeFormService } from './recipe-form.service';
import { RecipeImageService } from './recipe-image.service';
import { RecipeDataService } from './recipe-data.service';
import { NotificationService } from './notificacion.service';
import { Auth } from './auth';

@Injectable({
  providedIn: 'root',
})
export class RecipeUploadService {
  private router = inject(Router);
  private authService = inject(Auth);
  private recipeFormService = inject(RecipeFormService);
  private recipeImageService = inject(RecipeImageService);
  private recipeDataService = inject(RecipeDataService);
  private notificationService = inject(NotificationService);

  get images(): string[] {
    return this.recipeImageService.images;
  }

  get currentIndex(): number {
    return this.recipeImageService.currentIndex;
  }

  get isUploading(): boolean {
    return this.recipeImageService.isUploading;
  }

  get isEditMode(): boolean {
    return this.recipeDataService.isEditMode;
  }

  createRecipeForm(): FormGroup {
    return this.recipeFormService.createRecipeForm();
  }

  initializeEditMode(
    id: string,
    recipeForm: FormGroup,
    callback: (success: boolean) => void,
  ): void {
    this.recipeDataService.initializeEditMode(id, (success) => {
      if (!success) {
        this.notificationService.showToast('error', 'Receta no encontrada o sin permisos');
        callback(false);
        return;
      }

      const recipe = this.recipeDataService.getRecipeForEdit();
      if (recipe) {
        this.loadRecipeIntoForm(recipeForm, recipe);
        callback(true);
      } else {
        callback(false);
      }
    });
  }

  private loadRecipeIntoForm(recipeForm: FormGroup, recipe: any): void {
    recipeForm.patchValue({
      name: recipe.name,
      descripcion: recipe.descripcion,
      category: recipe.category,
      dificultad: recipe.dificultad || 'media',
      tiempoPreparacion: recipe.tiempoPreparacion || null,
      servings: recipe.servings || 2,
    });

    this.recipeFormService.clearAndLoadFormArray(
      recipeForm.get('ingredients') as any,
      recipe.ingredients,
    );
    this.recipeFormService.clearAndLoadStepsArray(recipeForm.get('steps') as any, recipe.steps);

    this.recipeImageService.images = [...recipe.images];
    this.recipeImageService.currentIndex = 0;
  }

  addFormArrayItem(formArray: any, isIngredient = false): void {
    this.recipeFormService.addFormArrayItem(formArray, isIngredient);
  }

  removeFormArrayItem(formArray: any, index: number, minItems: number = 1): boolean {
    const success = this.recipeFormService.removeFormArrayItem(formArray, index, minItems);
    if (!success) {
      this.notificationService.showToast('warning', `Debe haber al menos ${minItems} elemento`);
    }
    return success;
  }

  async uploadFiles(files: File[]): Promise<boolean> {
    const result = await this.recipeImageService.uploadFiles(
      files,
      this.recipeDataService.recipeId,
    );

    if (result === 'limit') {
      this.notificationService.showToast(
        'warning',
        `Máximo ${this.recipeImageService.MAX_IMAGES} imágenes por receta`,
      );
      return false;
    }

    if (result) {
      this.notificationService.showToast('success', 'Imágenes subidas correctamente');
    } else {
      this.notificationService.showToast('error', 'Error al subir imágenes');
    }

    return !!result;
  }

  async removeImage(index: number): Promise<void> {
    await this.recipeImageService.removeImage(index);
    this.notificationService.showToast('success', 'Imagen eliminada');
  }

  navigateImages(direction: 'next' | 'prev'): void {
    this.recipeImageService.navigateImages(direction);
  }

  async submitRecipe(recipeForm: FormGroup): Promise<boolean> {
    this.recipeFormService.markAllFieldsAsTouched(recipeForm);

    if (recipeForm.invalid) {
      this.notificationService.showToast('error', 'Por favor complete todos los campos requeridos');
      return false;
    }

    if (this.images.length === 0) {
      this.notificationService.showToast('error', 'Debe subir al menos una imagen');
      return false;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.notificationService.showToast('error', 'Sesión expirada o no iniciada');
      this.router.navigate(['/login']);
      return false;
    }

    const formData = this.recipeFormService.prepareFormData(recipeForm, this.images);
    const success = await this.recipeDataService.saveRecipe(formData, this.images);

    if (success) {
      const message = this.isEditMode
        ? 'Receta actualizada correctamente'
        : 'Receta cargada correctamente';
      this.notificationService.showToast('success', message);

      if (!this.isEditMode) {
        this.resetForm(recipeForm);
      }
      return true;
    } else {
      this.notificationService.showToast('error', 'Error al guardar la receta en el servidor');
      return false;
    }
  }

  private resetForm(recipeForm: FormGroup): void {
    recipeForm.reset();
    this.recipeImageService.resetImages();
    this.recipeDataService.resetRecipeId();
  }

  validateField(form: FormGroup, fieldName: string): boolean {
    return this.recipeFormService.validateField(form, fieldName);
  }

  validateArrayField(formArray: any, index: number): boolean {
    return this.recipeFormService.validateArrayField(formArray, index);
  }

  onDeleteCurrentImage(): Promise<any> {
    if (this.images.length === 0) return Promise.resolve();

    const idx = this.currentIndex;
    return this.notificationService.showConfirmation(
      'Eliminar imagen',
      '¿Estás seguro que quieres eliminar esta imagen?',
    );
  }
}
