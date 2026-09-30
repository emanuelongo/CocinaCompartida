import { Component, HostListener, inject, signal } from '@angular/core';
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
  templateUrl: './header.html',
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
  isMobileMenuOpen = signal(false);
  // Menú desplegable del usuario
  userMenuOpen = signal(false);
  // Menú desplegable de filtros unificado
  filtersMenuOpen = signal(false);

  readonly categories = [
    { id: 'todas', name: 'Todas las recetas' },
    { id: 'entradas', name: 'Entradas' },
    { id: 'platos-fuertes', name: 'Platos Fuertes' },
    { id: 'postres', name: 'Postres' },
    { id: 'bebidas', name: 'Bebidas' },
    { id: 'guarniciones', name: 'Guarniciones' }
  ];

  toggleFiltersMenu() {
    this.filtersMenuOpen.update(open => !open);
    if (this.filtersMenuOpen()) {
      this.closeUserMenu();
      this.showSuggestions.set(false);
    }
  }

  closeFiltersMenu() {
    this.filtersMenuOpen.set(false);
  }

  getActiveFilterCount(): number {
    let count = 0;
    if (this.selectedCategory !== 'todas') count++;
    count += this.searchService.currentDificultad().length;
    count += this.searchService.currentIngredientFilter().length;
    count += this.searchService.currentTimeFilter().length;
    return count;
  }

  clearAllFilters() {
    this.selectedCategory = 'todas';
    this.searchService.filterByCategory('todas');
    this.searchService.filterByDificultad([]);
    this.searchService.filterByIngredientCount([]);
    this.searchService.filterByTime([]);
    this.router.navigate(['/explore']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.filters-dropdown-wrapper')) {
      this.closeFiltersMenu();
    }
    if (!target.closest('.user-dropdown')) {
      this.closeUserMenu();
    }
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(open => !open);
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
  }

  // Menú del usuario
  toggleUserMenu() {
    this.userMenuOpen.update(open => !open);
    if (this.userMenuOpen()) {
      this.closeFiltersMenu();
    }
  }

  closeUserMenu() {
    this.userMenuOpen.set(false);
  }

  goToLogin() {
    this.closeMobileMenu();
    this.router.navigate(['/login']);
  }

  onSearch() {
    this.closeMobileMenu();
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

  onCategoryChange(categoryId: string) {
    this.closeMobileMenu();
    this.selectedCategory = categoryId;
    this.searchService.filterByCategory(categoryId);
    this.router.navigate(['/explore']);
  }

  onSortChange() {
    this.closeMobileMenu();
    this.searchService.setSortOption(this.sortOption);
    this.router.navigate(['/explore']);
  }

  // ── Custom filter dropdowns ──────────────────────────────
  dificultadMenuOpen = false;
  ingredientesMenuOpen = false;
  tiempoMenuOpen = false;

  toggleMenu(menu: 'dificultad' | 'ingredientes' | 'tiempo') {
    this.dificultadMenuOpen  = menu === 'dificultad'  ? !this.dificultadMenuOpen  : false;
    this.ingredientesMenuOpen = menu === 'ingredientes' ? !this.ingredientesMenuOpen : false;
    this.tiempoMenuOpen      = menu === 'tiempo'       ? !this.tiempoMenuOpen      : false;
  }

  toggleDificultad(val: string) {
    let current = [...this.searchService.currentDificultad()];
    if (val === 'todas') {
      current = [];
    } else {
      const idx = current.indexOf(val);
      if (idx >= 0) current.splice(idx, 1); else current.push(val);
    }
    this.searchService.filterByDificultad(current);
    this.router.navigate(['/explore']);
  }

  toggleIngredient(val: string) {
    let current = [...this.searchService.currentIngredientFilter()];
    if (val === 'todas') {
      current = [];
    } else {
      const idx = current.indexOf(val as any);
      if (idx >= 0) current.splice(idx, 1); else current.push(val as any);
    }
    this.searchService.filterByIngredientCount(current);
    this.router.navigate(['/explore']);
  }

  toggleTime(val: string) {
    let current = [...this.searchService.currentTimeFilter()];
    if (val === 'todas') {
      current = [];
    } else {
      const idx = current.indexOf(val as any);
      if (idx >= 0) current.splice(idx, 1); else current.push(val as any);
    }
    this.searchService.filterByTime(current);
    this.router.navigate(['/explore']);
  }

  getAvatarUrl(avatar?: string | null): string {
    if (!avatar) return 'logos/default.webp';
    if (/^https?:\/\//i.test(avatar) || avatar.startsWith('data:')) return avatar;
    return avatar.startsWith('/') ? avatar : `/${avatar}`;
  }
}