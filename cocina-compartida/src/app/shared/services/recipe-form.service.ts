import { Injectable, inject } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';

@Injectable({
  providedIn: 'root',
})
export class RecipeFormService {
  private fb = inject(FormBuilder);

  static meaningfulText(control: AbstractControl): ValidationErrors | null {
    const val = (control.value ?? '').trim();
    if (!val) return null;
    const hasLetter = /[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(val);
    return hasLetter ? null : { meaningfulText: true };
  }

  createIngredientGroup(nombre = '', importancia = '', reemplazo = ''): FormGroup {
    return this.fb.group({
      nombre: [nombre, [Validators.required, RecipeFormService.meaningfulText]],
      importancia: [importancia || 'obligatorio'],
      reemplazo: [reemplazo]
    });
  }

  createRecipeForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), RecipeFormService.meaningfulText]],
      descripcion: [
        '',
        [Validators.required, Validators.minLength(10), RecipeFormService.meaningfulText],
      ],
      category: ['', [Validators.required]],
      dificultad: ['media', [Validators.required]],
      tiempoPreparacion: [null],
      servings: [
        2,
        [Validators.required, Validators.min(1), Validators.max(100), Validators.pattern(/^\d+$/)],
      ],
      ingredients: this.fb.array([this.createIngredientGroup()]),
      steps: this.fb.array([
        this.fb.control('', [Validators.required, RecipeFormService.meaningfulText]),
      ]),
    });
  }

  clearAndLoadFormArray(formArray: FormArray, items: any[]): void {
    formArray.clear();
    items.forEach(item => {
      if (typeof item === 'string') {
        // Compatibilidad con recetas guardadas en formato antiguo
        formArray.push(this.createIngredientGroup(item, 'obligatorio', ''));
      } else if (item && typeof item === 'object') {
        formArray.push(this.createIngredientGroup(item.nombre ?? item.name ?? '', item.importancia ?? 'obligatorio', item.reemplazo ?? ''));
      } else {
        formArray.push(this.createIngredientGroup());
      }
    });
  }

  clearAndLoadStepsArray(formArray: FormArray, items: string[]): void {
    formArray.clear();
    items.forEach((item) => formArray.push(this.fb.control(item, Validators.required)));
  }

  addFormArrayItem(formArray: FormArray, isIngredient = false): void {
    if (isIngredient) {
      formArray.push(this.createIngredientGroup());
    } else {
      formArray.push(this.fb.control('', [Validators.required, RecipeFormService.meaningfulText]));
    }
  }

  removeFormArrayItem(formArray: FormArray, index: number, minItems: number = 1): boolean {
    if (formArray.length <= minItems) {
      return false;
    }
    formArray.removeAt(index);
    return true;
  }

  markAllFieldsAsTouched(form: FormGroup): void {
    Object.keys(form.controls).forEach((key) => {
      const control = form.get(key);
      if (control instanceof FormArray) {
        control.controls.forEach((arrayControl) => {
          arrayControl.markAsTouched();
        });
      } else {
        control?.markAsTouched();
      }
    });
  }

  validateField(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return field ? field.invalid && field.touched : false;
  }

  validateArrayField(formArray: FormArray, index: number): boolean {
    const control = formArray.at(index);
    if (control instanceof FormGroup) {
      const nombreCtrl = control.get('nombre');
      return nombreCtrl ? nombreCtrl.invalid && nombreCtrl.touched : false;
    }
    return control.invalid && control.touched;
  }

  prepareFormData(form: FormGroup, images: string[]): any {
    const filteredIngredients = (form.value.ingredients as any[])
      .filter((ing: any) => ing?.nombre?.trim() !== '')
      .map((ing: any) => ({
        nombre: ing.nombre.trim(),
        importancia: ing.importancia || 'obligatorio',
        reemplazo: ing.importancia === 'reemplazable' ? (ing.reemplazo ?? '').trim() : '',
      }));
    const filteredSteps = form.value.steps.filter((step: string) => step?.trim() !== '');

    return {
      name: form.value.name.trim(),
      descripcion: form.value.descripcion.trim(),
      category: form.value.category,
      dificultad: form.value.dificultad || 'media',
      tiempoPreparacion: form.value.tiempoPreparacion ? Number(form.value.tiempoPreparacion) : null,
      servings: Number(form.value.servings),
      ingredients: filteredIngredients,
      steps: filteredSteps,
      images: images,
    };
  }
}
