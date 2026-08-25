import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RecipeService } from '../../../shared/services/recipe';
import { Recipe } from '../../../shared/interfaces/recipe';

interface ShoppingItem {
  label: string;
  checked: boolean;
}

@Component({
  selector: 'app-shopping-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './shopping-list.html',
  styleUrl: './shopping-list.css',
})
export class ShoppingList implements OnInit {
  private readonly recipeService = inject(RecipeService);
  readonly recipes = this.recipeService.recipes;
  readonly selectedRecipeIds = signal<string[]>(this.loadSelectedRecipes());
  readonly checkedItems = signal<Record<string, boolean>>(this.loadCheckedItems());

  ngOnInit(): void {
    this.refreshCheckedItems();
  }

  isSelected(recipeId: string): boolean {
    return this.selectedRecipeIds().includes(recipeId);
  }

  toggleRecipe(recipe: Recipe): void {
    const selected = this.isSelected(recipe.id)
      ? this.selectedRecipeIds().filter((id) => id !== recipe.id)
      : [...this.selectedRecipeIds(), recipe.id];
    this.selectedRecipeIds.set(selected);
    localStorage.setItem('cocina-selected-recipes', JSON.stringify(selected));
    this.refreshCheckedItems();
  }

  shoppingItems(): ShoppingItem[] {
    const selected = this.recipes().filter((recipe) => this.isSelected(recipe.id));
    const totals = new Map<string, { quantity: number; unit: string; name: string }>();
    const unquantified: string[] = [];

    selected.forEach((recipe) => recipe.ingredients.forEach((ingredient) => {
      const parsed = this.parseIngredient(ingredient);
      if (!parsed) {
        if (!unquantified.includes(ingredient)) unquantified.push(ingredient);
        return;
      }
      const key = `${parsed.unit}|${parsed.name}`;
      const current = totals.get(key);
      totals.set(key, {
        quantity: (current?.quantity || 0) + parsed.quantity,
        unit: parsed.unit,
        name: parsed.name,
      });
    }));

    const items = [...totals.values()].map((item) => ({
      label: `${this.formatQuantity(item.quantity)} ${item.unit} ${item.name}`,
      checked: this.checkedItems()[this.itemKey(item.unit, item.name)] || false,
    }));
    return [...items, ...unquantified.map((name) => ({
      label: name,
      checked: this.checkedItems()[`text|${name}`] || false,
    }))];
  }

  toggleItem(label: string): void {
    const current = this.checkedItems();
    const key = this.itemKeyFromLabel(label);
    const updated = { ...current, [key]: !current[key] };
    this.checkedItems.set(updated);
    localStorage.setItem('cocina-shopping-checked', JSON.stringify(updated));
  }

  clearList(): void {
    this.selectedRecipeIds.set([]);
    this.checkedItems.set({});
    localStorage.removeItem('cocina-selected-recipes');
    localStorage.removeItem('cocina-shopping-checked');
  }

  private refreshCheckedItems(): void {
    const validKeys = new Set(this.shoppingItems().map((item) => this.itemKeyFromLabel(item.label)));
    const checked = Object.fromEntries(Object.entries(this.checkedItems()).filter(([key]) => validKeys.has(key)));
    this.checkedItems.set(checked);
    localStorage.setItem('cocina-shopping-checked', JSON.stringify(checked));
  }

  private parseIngredient(value: string): { quantity: number; unit: string; name: string } | null {
    const match = value.trim().match(/^(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?)\s*(kg|g|gramos?|kilogramos?|ml|l|litros?|mililitros?|tazas?|cucharadas?|cucharaditas?)\.?\s+(?:de\s+)?(.+)$/i);
    if (!match) return null;
    const parts = match[1].replace(',', '.').split('/').map(Number);
    const quantity = parts.length === 2 ? parts[0] / parts[1] : parts[0];
    if (!Number.isFinite(quantity) || quantity <= 0) return null;
    return { quantity, unit: this.normalizeUnit(match[2]), name: match[3].trim().toLowerCase() };
  }

  private normalizeUnit(unit: string): string {
    if (/kg|kilogramo/i.test(unit)) return 'kg';
    if (/^g|gramo/i.test(unit)) return 'g';
    if (/ml|mililitro/i.test(unit)) return 'ml';
    if (/^l|litro/i.test(unit)) return 'l';
    if (/taza/i.test(unit)) return 'taza';
    if (/cucharadita/i.test(unit)) return 'cucharadita';
    return 'cucharada';
  }

  private formatQuantity(quantity: number): string {
    return Number.isInteger(quantity) ? String(quantity) : quantity.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  }

  private itemKey(unit: string, name: string): string {
    return `${unit}|${name}`;
  }

  private itemKeyFromLabel(label: string): string {
    const parsed = this.parseIngredient(label);
    return parsed ? this.itemKey(parsed.unit, parsed.name) : `text|${label}`;
  }

  private loadSelectedRecipes(): string[] {
    try { return JSON.parse(localStorage.getItem('cocina-selected-recipes') || '[]'); } catch { return []; }
  }

  private loadCheckedItems(): Record<string, boolean> {
    try { return JSON.parse(localStorage.getItem('cocina-shopping-checked') || '{}'); } catch { return {}; }
  }
}
