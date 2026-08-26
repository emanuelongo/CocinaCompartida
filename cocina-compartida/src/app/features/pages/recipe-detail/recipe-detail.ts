import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { RecipeService } from '../../../shared/services/recipe';
import { Recipe } from '../../../shared/interfaces/recipe';
import { Auth } from '../../../shared/services/auth';
import Swal from 'sweetalert2';
import { CookingExperiencePanel } from '../../components/cooking-experience-panel/cooking-experience-panel';
import { PortionAdjuster } from '../../components/portion-adjuster/portion-adjuster';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CookingExperiencePanel, PortionAdjuster],
  templateUrl: './recipe-detail.html',
  styleUrls: ['./recipe-detail.css'],
})
export class RecipeDetail implements OnInit {
  // --- Propiedades de Estado ---
  recipe: Recipe | undefined;
  isLoading: boolean = true;
  error: string | null = null;

  currentIndex: number = 0;
  newComment: string = '';

  private route = inject(ActivatedRoute);
  private recipeService = inject(RecipeService);
  authService = inject(Auth);
  private router = inject(Router);

  ngOnInit(): void {
    this.loadRecipe();
  }

  private async loadRecipe(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    const recipeId = this.route.snapshot.paramMap.get('id');

    if (!recipeId) {
      this.isLoading = false;
      this.error = 'Error de URL: No se encontró un ID de receta.';
      this.router.navigate(['/home']);
      return;
    }

    try {
      const recipeData = await this.recipeService.getRecipeById(recipeId);

      if (recipeData) {
        this.recipe = recipeData;
      } else {
        this.error = 'Hubo un problema al cargar la receta. Es posible que haya sido eliminada.';
      }
    } catch (e) {
      console.error('Error al buscar la receta:', e);
      this.error = 'Hubo un problema al cargar los detalles de la receta.';
    } finally {
      this.isLoading = false;
    }
  }

  // Normaliza la URL del avatar para asegurar que sea absoluta o comience con '/'
  getAvatarUrl(avatar?: string | null): string {
    if (!avatar) return 'assets/logos/default-avatar.png';
    // Si ya es URL absoluta o data:, devolver tal cual
    if (/^https?:\/\//i.test(avatar) || avatar.startsWith('data:')) return avatar;
    // Asegurar que empiece por '/'
    return avatar.startsWith('/') ? avatar : `/${avatar}`;
  }

  getIngredientName(ing: any): string {
    if (!ing) return '';
    if (typeof ing === 'string') {
      try {
        const parsed = JSON.parse(ing);
        if (parsed && typeof parsed === 'object' && parsed.nombre) {
          return parsed.nombre;
        }
      } catch {}
      return ing;
    }
    return ing.nombre || '';
  }

  getIngredientImportance(ing: any): string {
    if (!ing) return 'obligatorio';
    if (typeof ing === 'string') {
      try {
        const parsed = JSON.parse(ing);
        if (parsed && typeof parsed === 'object' && parsed.importancia) {
          return parsed.importancia;
        }
      } catch {}
      return 'obligatorio';
    }
    return ing.importancia || 'obligatorio';
  }

  getIngredientReplacement(ing: any): string {
    if (!ing) return '';
    if (typeof ing === 'string') {
      try {
        const parsed = JSON.parse(ing);
        if (parsed && typeof parsed === 'object' && parsed.reemplazo) {
          return parsed.reemplazo;
        }
      } catch {}
      return '';
    }
    return ing.reemplazo || '';
  }

  nextImage(): void {
    if (this.recipe && this.recipe.images.length > 0) {
      this.currentIndex = (this.currentIndex + 1) % this.recipe.images.length;
    }
  }

  prevImage(): void {
    if (this.recipe && this.recipe.images.length > 0) {
      this.currentIndex =
        (this.currentIndex - 1 + this.recipe.images.length) % this.recipe.images.length;
    }
  }

  async submitComment(): Promise<void> {
    if (!this.recipe) return;

    if (!this.authService.isLoged()) {
      Swal.fire({
        title: '¡Necesitas iniciar sesión!',
        text: 'Para comentar, primero debes iniciar sesión.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Iniciar Sesión',
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/login']);
        }
      });
      return;
    }

    const text = (this.newComment || '').trim();
    if (!text) {
      await Swal.fire({ icon: 'warning', title: 'Escribe un comentario' });
      return;
    }

    const recipeId = this.recipe.id;

    try {
      await this.recipeService.addComment(recipeId, { message: text });
      const updatedRecipe = await this.recipeService.getRecipeById(recipeId);
      if (updatedRecipe) {
        this.recipe = updatedRecipe;
      }

      this.newComment = '';
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Comentario agregado',
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (e) {
      console.error('Error al agregar el comentario:', e);
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo agregar el comentario.' });
    }
  }

  canEdit(): boolean {
    if (!this.recipe) return false;
    const user = this.authService.getUserProfile();
    if (!user) return false;

    if (this.recipe.user && this.recipe.user.id === user.id) {
      return true;
    }
    return false;
  }

  goToEdit(): void {
    if (!this.recipe || !this.canEdit()) return;
    this.router.navigate(['/recipe', this.recipe.id, 'edit']);
  }

  async deleteRecipe(): Promise<void> {
    if (!this.recipe || !this.canEdit()) return;

    const result = await Swal.fire({
      title: 'Eliminar receta',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      try {
        const success = await this.recipeService.deleteRecipe(this.recipe!.id);

        if (success) {
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Receta eliminada',
            showConfirmButton: false,
            timer: 1500,
          });
          this.router.navigate(['/profile']);
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'La receta no pudo ser eliminada (posiblemente error del servidor).',
          });
        }
      } catch (e) {
        console.error('Error al eliminar la receta:', e);
        Swal.fire({
          icon: 'error',
          title: 'Error de Red',
          text: 'Hubo un problema de conexión al intentar eliminar la receta.',
        });
      }
    }
  }

  async downloadPDF(): Promise<void> {
    if (!this.recipe) return;

    try {
      await this.recipeService.downloadPDF(this.recipe.id);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'PDF descargado',
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (e) {
      console.error('Error al descargar PDF:', e);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo descargar el PDF de la receta.',
      });
    }
  }

  async downloadImage(): Promise<void> {
    if (!this.recipe || !this.recipe.images || this.recipe.images.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin imagen',
        text: 'Esta receta no tiene imágenes para descargar.',
      });
      return;
    }

    try {
      await this.recipeService.downloadImage(this.recipe.id);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Imagen descargada',
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (e) {
      console.error('Error al descargar imagen:', e);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo descargar la imagen de la receta.',
      });
    }
  }
}