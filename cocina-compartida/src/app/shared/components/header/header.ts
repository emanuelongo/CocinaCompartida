import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Auth } from '../../services/auth';
import { SearchService, SortOption } from '../../services/search.service';
import { Recipe } from '../../interfaces/recipe';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './header.html', // Asegúrate de tener este archivo
  styleUrls: ['./header.css']
})
export class Header {
  private router = inject(Router);
  searchService = inject(SearchService);
  authService = inject(Auth);
  
  searchQuery = '';
  sortOption: SortOption = 'recent';
  selectedCategory = 'todas';
  showSuggestions = signal(false);
  selectedSuggestionIndex = signal(-1);

  readonly categories = [
    { id: 'todas', name: 'Todas las recetas' },
    { id: 'entradas', name: 'Entradas' },
    { id: 'platos-fuertes', name: 'Platos Fuertes' },
    { id: 'postres', name: 'Postres' },
    { id: 'bebidas', name: 'Bebidas' },
    { id: 'guarniciones', name: 'Guarniciones' }
  ];

  goToLogin() {
    this.router.navigate(['/login']);
  }

  getAvatarUrl(avatar?: string | null): string {
    if (!avatar) return 'logos/default.webp';
    if (/^https?:\/\//i.test(avatar) || avatar.startsWith('data:')) return avatar;
    return avatar.startsWith('/') ? avatar : `/${avatar}`;
  }

  onAvatarError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'logos/default.webp';
    }
  }

  onSearch() {
    this.showSuggestions.set(false);
    this.selectedSuggestionIndex.set(-1);
    this.searchService.search(this.searchQuery);
    this.router.navigate(['/explore']);
  }

  onSearchInput() {
    if (this.searchQuery.trim()) {
      this.searchService.search(this.searchQuery);
      this.showSuggestions.set(true);
    } else {
      this.showSuggestions.set(false);
      this.selectedSuggestionIndex.set(-1);
    }
  }

  selectSuggestion(recipe: Recipe) {
    this.searchQuery = recipe.name;
    this.showSuggestions.set(false);
    this.selectedSuggestionIndex.set(-1);
    this.onSearch();
  }

  onKeyDown(event: KeyboardEvent) {
    const suggestions = this.searchService.suggestions();

    if (!this.showSuggestions() || suggestions.length === 0) {
      if (event.key === 'Enter') {
        this.onSearch();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedSuggestionIndex.update(index =>
          index < suggestions.length - 1 ? index + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedSuggestionIndex.update(index =>
          index > 0 ? index - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (this.selectedSuggestionIndex() >= 0) {
          this.selectSuggestion(suggestions[this.selectedSuggestionIndex()]);
        } else {
          this.onSearch();
        }
        break;
      case 'Escape':
        this.showSuggestions.set(false);
        this.selectedSuggestionIndex.set(-1);
        break;
    }
  }

  hideSuggestions() {
    // Delay hiding to allow click events on suggestions
    setTimeout(() => {
      this.showSuggestions.set(false);
      this.selectedSuggestionIndex.set(-1);
    }, 150);
  }

  onSortChange() {
    this.searchService.setSortOption(this.sortOption);
    this.router.navigate(['/explore']);
  }

  // Estados de los dropdowns custom
  dificultadMenuOpen = false;
  ingredientesMenuOpen = false;
  tiempoMenuOpen = false;

  toggleMenu(menu: 'dificultad' | 'ingredientes' | 'tiempo') {
    if (menu === 'dificultad') {
      this.dificultadMenuOpen = !this.dificultadMenuOpen;
      this.ingredientesMenuOpen = false;
      this.tiempoMenuOpen = false;
    } else if (menu === 'ingredientes') {
      this.ingredientesMenuOpen = !this.ingredientesMenuOpen;
      this.dificultadMenuOpen = false;
      this.tiempoMenuOpen = false;
    } else if (menu === 'tiempo') {
      this.tiempoMenuOpen = !this.tiempoMenuOpen;
      this.dificultadMenuOpen = false;
      this.ingredientesMenuOpen = false;
    }
  }

  toggleDificultad(val: string) {
    let current = [...this.searchService.currentDificultad()];
    if (val === 'todas') {
      current = [];
    } else {
      if (current.includes(val)) {
        current = current.filter(d => d !== val);
      } else {
        current.push(val);
      }
    }
    this.searchService.filterByDificultad(current);
    this.router.navigate(['/explore']);
  }

  toggleIngredient(val: string) {
    let current = [...this.searchService.currentIngredientFilter()];
    if (val === 'todas') {
      current = [];
    } else {
      if (current.includes(val as any)) {
        current = current.filter(d => d !== val);
      } else {
        current.push(val as any);
      }
    }
    this.searchService.filterByIngredientCount(current);
    this.router.navigate(['/explore']);
  }

  toggleTime(val: string) {
    let current = [...this.searchService.currentTimeFilter()];
    if (val === 'todas') {
      current = [];
    } else {
      if (current.includes(val as any)) {
        current = current.filter(d => d !== val);
      } else {
        current.push(val as any);
      }
    }
    this.searchService.filterByTime(current);
    this.router.navigate(['/explore']);
  }

  onCategoryChange(categoryId: string) {
    this.searchService.filterByCategory(categoryId);
    this.router.navigate(['/explore']);
  }
}