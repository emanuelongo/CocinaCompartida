import { Component, inject, computed, signal, ViewChild, ElementRef, AfterViewInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecipeService } from '../../../shared/services/recipe';
import { Recipe } from '../../../shared/interfaces/recipe';
import { Auth } from '../../../shared/services/auth';
import { Router, RouterLink } from '@angular/router';
import { SearchService } from '../../../shared/services/search.service';
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

  readonly categories = [
    { id: 'todas', name: 'Todas', icon: '🍽️' },
    { id: 'entradas', name: 'Entradas', icon: '🥗' },
    { id: 'platos-fuertes', name: 'Platos Fuertes', icon: '🍲' },
    { id: 'postres', name: 'Postres', icon: '🍰' },
    { id: 'bebidas', name: 'Bebidas', icon: '🍹' },
    { id: 'guarniciones', name: 'Guarniciones', icon: '🥔' }
  ];

  selectCategory(catId: string) {
    this.searchService.filterByCategory(catId);
  }

  surpriseMe(): void {
    const recipes = this.allRecipes();
    if (recipes.length === 0) return;

    const randomIndex = crypto.getRandomValues(new Uint32Array(1))[0] % recipes.length;
    const randomRecipe = recipes[randomIndex];
    this.router.navigate(['/recipe', randomRecipe.id]);
  }

  readonly allRecipes = computed(() =>
    this.searchService.results().length > 0
      ? this.searchService.results()
      : this.recipeService.recipes()
  );
  private readonly recipesPerPage = 6;
  visibleRecipeCount = signal<number>(this.recipesPerPage);

  readonly recipesToShow = computed(() => {
    const count = this.visibleRecipeCount();
    return this.allRecipes().slice(0, count);
  });

  private recipeUpdateEffect = effect(() => {
    const currentCount = this.allRecipes().length;
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
    this.searchService.clearFilters();
  }

  trackByRecipeId(index: number, recipe: Recipe): string {
    return recipe.id;
  }


  ngAfterViewInit() {
    // Defer to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      // Solo configurar el observer si el trigger existe en el DOM
      if (this.loadMoreTrigger?.nativeElement) {
        this.observer = new IntersectionObserver((entries) => {
          if (entries[0].isIntersecting && !this.isLoading()) {
            this.loadMore();
          }
        }, {
          threshold: 0.5,
          rootMargin: '100px'
        });
        this.observer.observe(this.loadMoreTrigger.nativeElement);
      }

      // Observable effect para conocer cambios en recipesToShow
      effect(() => {
        // Si el trigger existe y no hay observer, crear uno
        if (this.loadMoreTrigger?.nativeElement && !this.observer) {
          this.observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !this.isLoading()) {
              this.loadMore();
            }
          }, {
            threshold: 0.5,
            rootMargin: '100px'
          });
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