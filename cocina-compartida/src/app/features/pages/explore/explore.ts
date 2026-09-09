import { Component, inject, computed, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecipeService } from '../../../shared/services/recipe';
import { Recipe } from '../../../shared/interfaces/recipe';
import { Auth } from '../../../shared/services/auth';
import { Router, RouterLink } from '@angular/router';
import { SearchService, IngredientFilter, TimeFilter } from '../../../shared/services/search.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './explore.html',
  styleUrls: ['./explore.css']
})
export class Explore implements AfterViewInit, OnDestroy {
  private recipeService = inject(RecipeService);
  authService = inject(Auth);
  private router = inject(Router);
  isLoading = signal<boolean>(false);
  private previousRecipeCount = 0;

  @ViewChild('loadMoreTrigger') loadMoreTrigger!: ElementRef;
  private observer?: IntersectionObserver;

  searchService = inject(SearchService);

  // Muestra resultados filtrados si hay algún filtro activo, o todas las recetas
  readonly allRecipes = computed(() => {
    const hasFilters = this.searchService.hasActiveFilters();
    return hasFilters ? this.searchService.results() : this.recipeService.recipes();
  });

  private readonly recipesPerPage = 6;
  visibleRecipeCount = signal<number>(this.recipesPerPage);

  readonly recipesToShow = computed(() => {
    return this.allRecipes().slice(0, this.visibleRecipeCount());
  });

  private recipeUpdateEffect = effect(() => {
    const currentCount = this.recipeService.recipes().length;
    if (currentCount > this.previousRecipeCount && this.previousRecipeCount !== 0) {
      this.handleNewRecipes();
    }
    this.previousRecipeCount = currentCount;
  });

  private async loadMore() {
    if (this.visibleRecipeCount() >= this.allRecipes().length) return;
    this.isLoading.set(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      this.visibleRecipeCount.update(count => count + this.recipesPerPage);
    } finally {
      this.isLoading.set(false);
    }
  }

  private handleNewRecipes() {
    Swal.fire({
      title: '¡Nuevas recetas disponibles!',
      text: '¿Deseas ver las nuevas recetas?',
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Sí, actualizar',
      cancelButtonText: 'No, después'
    }).then((result) => {
      if (result.isConfirmed) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  clearSearch() {
    this.visibleRecipeCount.set(this.recipesPerPage);
    this.searchService.clearFilters();
  }

  setDificultad(dificultad: string) {
    this.visibleRecipeCount.set(this.recipesPerPage);
    const current = [...this.searchService.currentDificultad()];
    if (dificultad === 'todas') {
      this.searchService.filterByDificultad([]);
    } else {
      const idx = current.indexOf(dificultad);
      if (idx >= 0) current.splice(idx, 1); else current.push(dificultad);
      this.searchService.filterByDificultad(current);
    }
  }

  setIngredientFilter(filter: IngredientFilter) {
    this.visibleRecipeCount.set(this.recipesPerPage);
    const current = [...this.searchService.currentIngredientFilter()];
    if (filter === 'todas') {
      this.searchService.filterByIngredientCount([]);
    } else {
      const idx = current.indexOf(filter);
      if (idx >= 0) current.splice(idx, 1); else current.push(filter);
      this.searchService.filterByIngredientCount(current);
    }
  }

  setTimeFilter(filter: TimeFilter) {
    this.visibleRecipeCount.set(this.recipesPerPage);
    const current = [...this.searchService.currentTimeFilter()];
    if (filter === 'todas') {
      this.searchService.filterByTime([]);
    } else {
      const idx = current.indexOf(filter);
      if (idx >= 0) current.splice(idx, 1); else current.push(filter);
      this.searchService.filterByTime(current);
    }
  }

  getDificultadLabel(dificultad?: string): string {
    switch (dificultad) {
      case 'facil': return '🟢 Fácil';
      case 'dificil': return '🔴 Difícil';
      default: return '🟡 Media';
    }
  }

  trackByRecipeId(index: number, recipe: Recipe): string {
    return recipe.id;
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.loadMoreTrigger?.nativeElement) {
        this.observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting && !this.isLoading()) {
            this.loadMore();
          }
        }, { threshold: 0.5, rootMargin: '100px' });
        this.observer.observe(this.loadMoreTrigger.nativeElement);
      }

      effect(() => {
        if (this.loadMoreTrigger?.nativeElement && !this.observer) {
          this.observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !this.isLoading()) {
              this.loadMore();
            }
          }, { threshold: 0.5, rootMargin: '100px' });
          this.observer.observe(this.loadMoreTrigger.nativeElement);
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  toggleLike(recipeId: string): void {
    if (!this.authService.isLoged()) {
      this.showLoginAlert("dar 'Me Gusta'");
      return;
    }
    this.recipeService.toggleLike(recipeId);
  }

  hasLiked(recipe: Recipe): boolean {
    if (!this.authService.isLoged()) return false;
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return false;
    return recipe.likedBy?.includes(currentUser.id) ?? false;
  }

  private showLoginAlert(action: string): void {
    Swal.fire({
      title: '¡Necesitas iniciar sesión!',
      text: `Para ${action}, primero debes iniciar sesión.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Iniciar Sesión'
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/login']);
      }
    });
  }
}