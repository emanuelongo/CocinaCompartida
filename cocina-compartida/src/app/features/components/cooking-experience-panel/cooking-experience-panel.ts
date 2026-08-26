import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { Auth } from '../../../shared/services/auth';
import { CookingJournalService } from '../../../shared/services/cooking-journal.service';
import { CookingExperience } from '../../../shared/interfaces/cooking-experience';

@Component({
  selector: 'app-cooking-experience-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cooking-experience-panel.html',
  styleUrl: './cooking-experience-panel.css',
})
export class CookingExperiencePanel implements OnInit, OnDestroy {
  @Input({ required: true }) recipeId = '';
  @Input({ required: true }) recipeName = '';
  @ViewChild('photoInput') photoInput?: ElementRef<HTMLInputElement>;

  readonly auth = inject(Auth);
  private readonly journalService = inject(CookingJournalService);
  readonly ratingScale = [1, 2, 3, 4, 5];

  experiences: CookingExperience[] = [];
  rating = 0;
  preparationNotes = '';
  ingredientChanges = '';
  recommendations = '';
  selectedPhoto?: File;
  photoPreview?: string;
  fileError = '';
  isLoading = false;
  isSaving = false;

  ngOnInit(): void {
    if (this.auth.isLoged()) {
      void this.loadExperiences();
    }
  }

  ngOnDestroy(): void {
    this.releasePreview();
  }

  async loadExperiences(): Promise<void> {
    this.isLoading = true;
    try {
      this.experiences = await this.journalService.getMineByRecipe(this.recipeId);
    } catch {
      this.experiences = [];
    } finally {
      this.isLoading = false;
    }
  }

  selectRating(value: number): void {
    this.rating = value;
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.fileError = '';
    this.releasePreview();
    this.selectedPhoto = undefined;

    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      this.fileError = 'Selecciona una imagen JPEG, PNG, WebP o GIF.';
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.fileError = 'La fotografía no puede superar 5 MB.';
      input.value = '';
      return;
    }

    this.selectedPhoto = file;
    this.photoPreview = URL.createObjectURL(file);
  }

  async submit(): Promise<void> {
    if (!this.rating || this.isSaving) {
      if (!this.rating) {
        await Swal.fire({ icon: 'warning', title: 'Selecciona una calificación' });
      }
      return;
    }

    this.isSaving = true;
    try {
      const created = await this.journalService.create(this.recipeId, {
        rating: this.rating,
        preparationNotes: this.preparationNotes.trim(),
        ingredientChanges: this.ingredientChanges.trim(),
        recommendations: this.recommendations.trim(),
        photo: this.selectedPhoto,
      });
      this.experiences = [created, ...this.experiences];
      this.resetForm();
      await Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Experiencia guardada',
        showConfirmButton: false,
        timer: 1800,
      });
    } catch (error: any) {
      const message = error?.error?.message || 'No fue posible guardar tu experiencia.';
      await Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: message });
    } finally {
      this.isSaving = false;
    }
  }

  async remove(experience: CookingExperience): Promise<void> {
    const confirmation = await Swal.fire({
      icon: 'warning',
      title: 'Eliminar esta experiencia',
      text: 'La fotografía y las notas también se eliminarán.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#b42318',
    });
    if (!confirmation.isConfirmed) return;

    try {
      await this.journalService.remove(experience.id);
      this.experiences = this.experiences.filter((item) => item.id !== experience.id);
    } catch {
      await Swal.fire({ icon: 'error', title: 'No se pudo eliminar la experiencia' });
    }
  }

  private resetForm(): void {
    this.rating = 0;
    this.preparationNotes = '';
    this.ingredientChanges = '';
    this.recommendations = '';
    this.selectedPhoto = undefined;
    this.fileError = '';
    this.releasePreview();
    if (this.photoInput) this.photoInput.nativeElement.value = '';
  }

  private releasePreview(): void {
    if (this.photoPreview) URL.revokeObjectURL(this.photoPreview);
    this.photoPreview = undefined;
  }
}