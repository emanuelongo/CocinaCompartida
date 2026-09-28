import { Component, inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';
import { RecipeUploadService } from '../../../shared/services/recipe-upload.service';

@Component({
  selector: 'app-recipe-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
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

  getIngredientGroup(index: number): FormGroup {
    return this.ingredients.at(index) as FormGroup;
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