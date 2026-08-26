import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecipeService } from '../../../shared/services/recipe';
import { Recipe } from '../../../shared/interfaces/recipe';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../../shared/services/auth';
import Swal from 'sweetalert2';
import { RecipeInteractionService } from '../../../shared/services/recipe-interaction.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class Home {
  authService = inject(Auth);
  private recipeService = inject(RecipeService);
  private router = inject(Router);
  private recipeInteractionService = inject(RecipeInteractionService);

  allRecipes = this.recipeService.recipes;

  private initialRecipesCount = 3;

  get featuredRecipes(): Recipe[] {
    const recipes = this.allRecipes();
    
    return [...recipes]
      .sort((a, b) => {
        const likesA = Number.isFinite(a.likes) ? a.likes! : 0;
        const likesB = Number.isFinite(b.likes) ? b.likes! : 0;
        return likesB - likesA;
      })
      .slice(0, this.initialRecipesCount);
  }

  trackByRecipeId(index: number, recipe: any): number {
    return recipe.id;
  }

  navigateToExplore() {
    this.router.navigate(['/explore']);
  }

  checkAuthAndNavigate() {
    if (this.authService.isLoged()) {
      this.router.navigate(['/recipe-upload']);
    } else {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'warning',
        title: 'Debes iniciar sesión para crear una receta',
        showConfirmButton: true,
        confirmButtonText: 'Iniciar Sesión',
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        timer: 5000,
        timerProgressBar: true
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/login']);
        }
      });
    }
  }

  async toggleLike(recipe: Recipe) {
    if (!this.authService.isLoged()) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'warning',
        title: 'Debes iniciar sesión para dar like',
        showConfirmButton: true,
        confirmButtonText: 'Iniciar Sesión',
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        timer: 5000,
        timerProgressBar: true
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/login']);
        }
      });
      return;
    }

    try {
      await this.recipeInteractionService.toggleLike(recipe.id);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  }

  hasLiked(recipe: Recipe): boolean {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId || !recipe.likedBy) return false;
    return recipe.likedBy.includes(userId);
  }
}