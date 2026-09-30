import { Component, inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';
import { RecipeUploadService } from '../../../shared/services/recipe-upload.service';

@Component({
  selector: 'app-recipe-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './recipe-upload.html',
  styleUrls: ['./recipe-upload.css'],
  providers: [RecipeUploadService]
})
export class RecipeUpload implements OnInit {
  recipeForm: FormGroup;
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private recipeUploadService = inject(RecipeUploadService);

  // Propiedades expuestas para la plantilla
  get images(): string[] {
    return this.recipeUploadService.images;
  }

  get currentIndex(): number {
    return this.recipeUploadService.currentIndex;
  }

  get isUploading(): boolean {
    return this.recipeUploadService.isUploading;
  }

  get isEditMode(): boolean {
    return this.recipeUploadService.isEditMode;
  }

  get ingredients(): FormArray {
    return this.recipeForm.get('ingredients') as FormArray;
  }

  get steps(): FormArray {
    return this.recipeForm.get('steps') as FormArray;
  }

  constructor() {
    this.recipeForm = this.recipeUploadService.createRecipeForm();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.recipeUploadService.initializeEditMode(id, this.recipeForm, (success) => {
          if (!success) {
            this.router.navigate(['/home']);
          }
        });
      }
    });
  }

  getIngredientGroup(index: number): FormGroup {
    return this.ingredients.at(index) as FormGroup;
  }

  getIngredientImportance(index: number): string {
    const group = this.ingredients.at(index);
    if (!group || !(group instanceof FormGroup)) {
      return 'obligatorio';
    }
    return group.get('importancia')?.value || 'obligatorio';
  }

  onImportanceChange(index: number): void {
    const group = this.ingredients.at(index);
    if (group && group instanceof FormGroup) {
      const imp = group.get('importancia')?.value;
      if (imp !== 'reemplazable') {
        group.get('reemplazo')?.setValue('');
      }
    }
  }

  getIngredientUnit(index: number): string {
    const group = this.ingredients.at(index);
    if (!group || !(group instanceof FormGroup)) {
      return 'g';
    }
    return group.get('unidad')?.value || 'g';
  }

  onUnitChange(index: number): void {
    const group = this.ingredients.at(index);
    if (group && group instanceof FormGroup) {
      const unidad = group.get('unidad')?.value;
      if (unidad !== 'otros') {
        group.get('otraUnidad')?.setValue('');
      }
    }
  }

  getIngredientErrors(index: number): string[] {
    const group = this.ingredients.at(index);
    if (!group || !(group instanceof FormGroup)) return [];

    const isTouched = group.touched || Object.values(group.controls).some((c) => c.touched);
    if (!isTouched) return [];

    const errors: string[] = [];
    const cantidadCtrl = group.get('cantidad');
    if (cantidadCtrl && (cantidadCtrl.touched || group.touched) && cantidadCtrl.invalid) {
      if (cantidadCtrl.errors?.['required']) {
        errors.push('La cantidad es requerida');
      } else if (cantidadCtrl.errors?.['pattern']) {
        errors.push('La cantidad no puede contener letras ni caracteres especiales');
      } else if (cantidadCtrl.errors?.['min']) {
        errors.push('La cantidad debe ser mayor a 0');
      } else if (cantidadCtrl.errors?.['max']) {
        errors.push('La cantidad no puede superar 9999');
      }
    }

    const nombreCtrl = group.get('nombre');
    if (nombreCtrl && (nombreCtrl.touched || group.touched) && nombreCtrl.invalid) {
      errors.push(
        'El nombre del ingrediente no puede estar vacío ni contener solo números o caracteres especiales',
      );
    }

    const unidadCtrl = group.get('unidad');
    const otraUnidadCtrl = group.get('otraUnidad');
    if (
      unidadCtrl?.value === 'otros' &&
      otraUnidadCtrl &&
      (otraUnidadCtrl.touched || group.touched)
    ) {
      if (!otraUnidadCtrl.value?.trim()) {
        errors.push('Debes especificar tu propia unidad de medida');
      }
    }

    return errors;
  }

  addIngredient(): void {
    this.recipeUploadService.addFormArrayItem(this.ingredients, true);
  }

  removeIngredient(index: number): void {
    this.recipeUploadService.removeFormArrayItem(this.ingredients, index, 1);
  }

  addStep(): void {
    this.recipeUploadService.addFormArrayItem(this.steps);
  }

  removeStep(index: number): void {
    this.recipeUploadService.removeFormArrayItem(this.steps, index, 1);
  }

  async onUploadFile(event: any): Promise<void> {
    const files: File[] = Array.from(event.target.files);
    await this.recipeUploadService.uploadFiles(files);
    event.target.value = '';
  }

  onDeleteCurrentImage(): void {
    if (this.images.length === 0) return;
    
    const idx = this.currentIndex;
    Swal.fire({
      title: 'Eliminar imagen',
      text: '¿Estás seguro que quieres eliminar esta imagen?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.recipeUploadService.removeImage(idx);
      }
    });
  }

  nextImage(): void {
    this.recipeUploadService.navigateImages('next');
  }

  prevImage(): void {
    this.recipeUploadService.navigateImages('prev');
  }

  async onSubmit(): Promise<void> {
    await this.recipeUploadService.submitRecipe(this.recipeForm);
  }

  isFieldInvalid(fieldName: string): boolean {
    return this.recipeUploadService.validateField(this.recipeForm, fieldName);
  }

  isArrayFieldInvalid(formArray: FormArray, index: number): boolean {
    return this.recipeUploadService.validateArrayField(formArray, index);
  }
}