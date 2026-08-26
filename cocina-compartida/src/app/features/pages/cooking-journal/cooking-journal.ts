import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { CookingExperience } from '../../../shared/interfaces/cooking-experience';
import { CookingJournalService } from '../../../shared/services/cooking-journal.service';

@Component({
  selector: 'app-cooking-journal',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cooking-journal.html',
  styleUrl: './cooking-journal.css',
})
export class CookingJournal implements OnInit {
  private readonly journalService = inject(CookingJournalService);
  readonly ratingScale = [1, 2, 3, 4, 5];

  experiences: CookingExperience[] = [];
  isLoading = true;
  hasError = false;

  get averageRating(): string {
    if (!this.experiences.length) return '0.0';
    const total = this.experiences.reduce((sum, item) => sum + item.rating, 0);
    return (total / this.experiences.length).toFixed(1);
  }

  get cookedRecipes(): number {
    return new Set(this.experiences.map((item) => item.recipe.id)).size;
  }

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  async load(): Promise<void> {
    this.isLoading = true;
    this.hasError = false;
    try {
      this.experiences = await this.journalService.getMine();
    } catch {
      this.hasError = true;
    } finally {
      this.isLoading = false;
    }
  }

  async remove(experience: CookingExperience): Promise<void> {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Eliminar esta experiencia',
      text: 'La fotografía y las notas también se eliminarán.',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#b42318',
    });
    if (!result.isConfirmed) return;

    try {
      await this.journalService.remove(experience.id);
      this.experiences = this.experiences.filter((item) => item.id !== experience.id);
    } catch {
      await Swal.fire({ icon: 'error', title: 'No se pudo eliminar la experiencia' });
    }
  }
}