import { Injectable, signal } from '@angular/core';
import { Recipe } from '../interfaces/recipe';
import { RecipeService } from './recipe';
import { inject } from '@angular/core';

export type SortOption = 'recent' | 'oldest' | 'likes';
export type IngredientFilter = 'todas' | 'menos5' | 'mas5';
export type TimeFilter = 'todas' | 'rapido' | 'medio' | 'largo';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private recipeService = inject(RecipeService);

  private searchResults     = signal<Recipe[]>([]);
  private searchSuggestions = signal<Recipe[]>([]);
  private sortBy            = signal<SortOption>('recent');
  private searchQuery       = signal<string>('');
  private categoryFilter    = signal<string>('todas');

  // Filtros múltiples (array vacío = sin filtro activo)
  private dificultadFilter  = signal<string[]>([]);
  private ingredientFilter  = signal<IngredientFilter[]>([]);
  private timeFilter        = signal<TimeFilter[]>([]);

  // Señales públicas de solo lectura
  readonly results                = this.searchResults.asReadonly();
  readonly suggestions            = this.searchSuggestions.asReadonly();
  readonly currentSort            = this.sortBy.asReadonly();
  readonly currentQuery           = this.searchQuery.asReadonly();
  readonly currentCategory        = this.categoryFilter.asReadonly();
  readonly currentDificultad      = this.dificultadFilter.asReadonly();
  readonly currentIngredientFilter = this.ingredientFilter.asReadonly();
  readonly currentTimeFilter      = this.timeFilter.asReadonly();

  // ── Búsqueda ─────────────────────────────────────────────
  search(query: string) {
    this.searchQuery.set(query);
    this.updateSuggestions(query);
    this.updateResults();
  }

  // ── Filtros ───────────────────────────────────────────────
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

  setSortOption(option: SortOption) {
    this.sortBy.set(option);
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

  // ── Resultados ────────────────────────────────────────────
  private updateResults() {
    let results = [...this.recipeService.recipes()];

    // Categoría
    if (this.categoryFilter() !== 'todas') {
      results = results.filter(r => r.category === this.categoryFilter());
    }

    // Búsqueda por texto
    const query = this.searchQuery().toLowerCase();
    if (query) {
      results = results
        .filter(r =>
          r.name.toLowerCase().includes(query) ||
          r.descripcion.toLowerCase().includes(query)
        )
        .map(r => ({ r, relevance: this.calculateRelevance(r, query) }))
        .sort((a, b) => b.relevance - a.relevance)
        .map(item => item.r);
    }

    // Dificultad (OR lógico)
    const difs = this.dificultadFilter();
    if (difs.length > 0) {
      results = results.filter(r => difs.includes(r.dificultad ?? 'media'));
    }

    // Ingredientes (OR lógico)
    const ings = this.ingredientFilter();
    if (ings.length > 0) {
      results = results.filter(r => {
        const count = Array.isArray(r.ingredients) ? r.ingredients.length : 0;
        return (ings.includes('menos5') && count < 5) ||
               (ings.includes('mas5')   && count >= 5);
      });
    }

    // Tiempo de preparación (OR lógico)
    const times = this.timeFilter();
    if (times.length > 0) {
      results = results.filter(r => {
        const t = r.tiempoPreparacion;
        if (t == null) return false;
        return (times.includes('rapido') && t < 30) ||
               (times.includes('medio')  && t >= 30 && t <= 60) ||
               (times.includes('largo')  && t > 60);
      });
    }

    // Ordenamiento final
    results = this.sortResults(results);

    this.searchResults.set(results);
  }

  // ── Sugerencias ───────────────────────────────────────────
  private updateSuggestions(query: string) {
    if (!query.trim()) {
      this.searchSuggestions.set([]);
      return;
    }

    const queryLower = query.toLowerCase();
    let pool = this.recipeService.recipes();

    if (this.categoryFilter() !== 'todas') {
      pool = pool.filter(r => r.category === this.categoryFilter());
    }

    const suggestions = pool
      .filter(r => {
        const name = r.name.toLowerCase();
        const desc = r.descripcion.toLowerCase();
        return name.includes(queryLower) ||
               desc.includes(queryLower) ||
               this.calculateSimilarity(name, queryLower) > 0.6;
      })
      .map(r => ({ r, relevance: this.calculateRelevance(r, query) }))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5)
      .map(item => item.r);

    this.searchSuggestions.set(suggestions);
  }

  // ── Utilidades ────────────────────────────────────────────
  private sortResults(recipes: Recipe[]): Recipe[] {
    switch (this.sortBy()) {
      case 'recent':  return [...recipes].sort((a, b) => b.id.localeCompare(a.id));
      case 'oldest':  return [...recipes].sort((a, b) => a.id.localeCompare(b.id));
      case 'likes':   return [...recipes].sort((a, b) => (b.likes || 0) - (a.likes || 0));
      default:        return recipes;
    }
  }

  private calculateRelevance(recipe: Recipe, query: string): number {
    const terms = query.toLowerCase().split(' ').filter(t => t.length > 0);
    if (terms.length === 0) return 0;
    let score = 0;
    const name = recipe.name.toLowerCase();
    const desc = recipe.descripcion.toLowerCase();
    for (const term of terms) {
      if (name === term)          score += 10;
      if (name.startsWith(term))  score += 8;
      if (name.includes(term))    score += 5;
      if (desc.includes(term))    score += 3;
      if (name.split(' ').includes(term)) score += 4;
    }
    return score;
  }

  private calculateSimilarity(s1: string, s2: string): number {
    const longer  = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 1.0;
    return (longer.length - this.levenshteinDistance(longer, shorter)) / longer.length;
  }

  private levenshteinDistance(s1: string, s2: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= s2.length; i++) matrix[i] = [i];
    for (let j = 0; j <= s1.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= s2.length; i++) {
      for (let j = 1; j <= s1.length; j++) {
        matrix[i][j] = s2[i - 1] === s1[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
    return matrix[s2.length][s1.length];
  }
}