import { Injectable, signal } from '@angular/core';
import { Recipe } from '../interfaces/recipe';
import { RecipeService } from './recipe';
import { inject } from '@angular/core';

export type SortOption = 'recent' | 'oldest' | 'likes';
export type IngredientFilter = 'todas' | 'menos5' | 'mas5';
export type TimeFilter = 'todas' | 'rapido' | 'medio' | 'largo'; // rapido<30, medio 30-60, largo>60

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private recipeService = inject(RecipeService);

  private searchResults = signal<Recipe[]>([]);
  private searchSuggestions = signal<Recipe[]>([]);
  private sortBy = signal<SortOption>('recent');
  private searchQuery = signal<string>('');
  private categoryFilter = signal<string>('todas');
  
  // Filtros múltiples (arrays vacíos = sin filtro)
  private dificultadFilter = signal<string[]>([]);
  private ingredientFilter = signal<IngredientFilter[]>([]);
  private timeFilter = signal<TimeFilter[]>([]);

  // Expone las señales como solo lectura
  readonly results = this.searchResults.asReadonly();
  readonly suggestions = this.searchSuggestions.asReadonly();
  readonly currentSort = this.sortBy.asReadonly();
  readonly currentQuery = this.searchQuery.asReadonly();
  readonly currentCategory = this.categoryFilter.asReadonly();
  readonly currentDificultad = this.dificultadFilter.asReadonly();
  readonly currentIngredientFilter = this.ingredientFilter.asReadonly();
  readonly currentTimeFilter = this.timeFilter.asReadonly();

  search(query: string) {
    this.searchQuery.set(query);
    this.updateSuggestions(query);
    this.updateResults();
  }

  private updateSuggestions(query: string) {
    if (!query.trim()) {
      this.searchSuggestions.set([]);
      return;
    }

    const queryLower = query.toLowerCase();
    const allRecipes = this.recipeService.recipes();

    let filteredRecipes = allRecipes;
    if (this.categoryFilter() !== 'todas') {
      filteredRecipes = allRecipes.filter(recipe => recipe.category === this.categoryFilter());
    }

    const suggestions = filteredRecipes
      .filter(recipe => {
        const name = recipe.name.toLowerCase();
        const description = recipe.descripcion.toLowerCase();
        return name.includes(queryLower) ||
               description.includes(queryLower) ||
               name.startsWith(queryLower) ||
               this.calculateSimilarity(name, queryLower) > 0.6 ||
               this.calculateSimilarity(description, queryLower) > 0.6;
      })
      .map(recipe => ({
        recipe,
        relevance: this.calculateRelevance(recipe, query)
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5)
      .map(item => item.recipe);

    this.searchSuggestions.set(suggestions);
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1.0;
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= str2.length; i++) { matrix[i] = [i]; }
    for (let j = 0; j <= str1.length; j++) { matrix[0][j] = j; }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }

  setSortOption(option: SortOption) {
    this.sortBy.set(option);
    this.updateResults();
  }

  filterByCategory(category: string) {
    this.categoryFilter.set(category);
    this.updateResults();
  }

  filterByDificultad(dificultades: string[]) {
    this.dificultadFilter.set(dificultades);
    this.updateResults();
  }

  filterByIngredientCount(filters: IngredientFilter[]) {
    this.ingredientFilter.set(filters);
    this.updateResults();
  }

  filterByTime(filters: TimeFilter[]) {
    this.timeFilter.set(filters);
    this.updateResults();
  }

  clearFilters() {
    this.categoryFilter.set('todas');
    this.dificultadFilter.set([]);
    this.ingredientFilter.set([]);
    this.timeFilter.set([]);
    this.searchQuery.set('');
    this.sortBy.set('recent');
    this.updateResults();
  }

  hasActiveFilters(): boolean {
    return (
      this.categoryFilter() !== 'todas' ||
      this.dificultadFilter().length > 0 ||
      this.ingredientFilter().length > 0 ||
      this.timeFilter().length > 0 ||
      this.searchQuery() !== ''
    );
  }

  private getIngredientCount(recipe: Recipe): number {
    if (!Array.isArray(recipe.ingredients)) return 0;
    return recipe.ingredients.length;
  }

  private applyFilters(recipes: Recipe[]): Recipe[] {
    let results = [...recipes];

    // Filtro de categoria
    if (this.categoryFilter() !== 'todas') {
      results = results.filter(r => r.category === this.categoryFilter());
    }

    // Filtro de dificultad (OR lógico entre las seleccionadas)
    const difFilters = this.dificultadFilter();
    if (difFilters.length > 0) {
      results = results.filter(r => difFilters.includes(r.dificultad ?? 'media'));
    }

    // Filtro de cantidad de ingredientes
    const ingFilters = this.ingredientFilter();
    if (ingFilters.length > 0) {
      results = results.filter(r => {
        const count = this.getIngredientCount(r);
        return (ingFilters.includes('menos5') && count < 5) || 
               (ingFilters.includes('mas5') && count >= 5) ||
               ingFilters.includes('todas');
      });
    }

    // Filtro de tiempo de preparacion
    const tFilters = this.timeFilter();
    if (tFilters.length > 0) {
      results = results.filter(r => {
        if (!r.tiempoPreparacion) return tFilters.includes('todas');
        const t = r.tiempoPreparacion;
        return (tFilters.includes('rapido') && t < 30) ||
               (tFilters.includes('medio') && t >= 30 && t <= 60) ||
               (tFilters.includes('largo') && t > 60) ||
               tFilters.includes('todas');
      });
    }

    return results;
  }

  private calculateRelevance(recipe: Recipe, query: string): number {
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    if (searchTerms.length === 0) return 0;
    let relevance = 0;
    const name = recipe.name.toLowerCase();
    const description = recipe.descripcion.toLowerCase();
    for (const term of searchTerms) {
      if (name === term) relevance += 10;
      if (name.startsWith(term)) relevance += 8;
      if (name.includes(term)) relevance += 5;
      if (description.includes(term)) relevance += 3;
      const nameWords = name.split(' ');
      if (nameWords.includes(term)) relevance += 4;
    }
    return relevance;
  }

  private updateResults() {
    const query = this.searchQuery().toLowerCase();
    let results = this.applyFilters(this.recipeService.recipes());

    if (!query) {
      this.searchResults.set(this.sortResults(results));
      return;
    }

    results = results
      .filter(recipe =>
        recipe.name.toLowerCase().includes(query) ||
        recipe.descripcion.toLowerCase().includes(query)
      )
      .map(recipe => ({
        recipe,
        relevance: this.calculateRelevance(recipe, query)
      }))
      .sort((a, b) => b.relevance - a.relevance)
      .map(item => item.recipe);

    if (this.sortBy() !== 'recent') {
      results = this.sortResults(results);
    }

    this.searchResults.set(results);
  }

  private sortResults(recipes: Recipe[]): Recipe[] {
    switch (this.sortBy()) {
      case 'recent':
        return [...recipes].sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
      case 'oldest':
        return [...recipes].sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateA - dateB;
        });
      case 'likes':
        return [...recipes].sort((a, b) => (b.likes || 0) - (a.likes || 0));
      default:
        return recipes;
    }
  }
}