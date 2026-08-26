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
  isMobileMenuOpen = signal(false);
  // Menú desplegable del usuario
  userMenuOpen = signal(false);

  readonly categories = [
    { id: 'todas', name: 'Todas las recetas' },
    { id: 'entradas', name: 'Entradas' },
    { id: 'platos-fuertes', name: 'Platos Fuertes' },
    { id: 'postres', name: 'Postres' },
    { id: 'bebidas', name: 'Bebidas' },
    { id: 'guarniciones', name: 'Guarniciones' }
  ];

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(open => !open);
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
  }

  // Menú del usuario
  toggleUserMenu() {
    this.userMenuOpen.update(open => !open);
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
}