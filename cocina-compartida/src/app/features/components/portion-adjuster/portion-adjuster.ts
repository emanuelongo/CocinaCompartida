import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ScaledIngredient } from '../../../shared/interfaces/scaled-ingredients';
import { PortionScalingService } from '../../../shared/services/portion-scaling.service';
import { IngredientItem } from '../../../shared/interfaces/recipe';

@Component({
  selector: 'app-portion-adjuster',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './portion-adjuster.html',
  styleUrl: './portion-adjuster.css',
})
export class PortionAdjuster implements OnInit {
  @Input({ required: true }) recipeId = '';
  @Input({ required: true }) originalIngredients: (string | IngredientItem)[] | any[] = [];
  @Input() originalServings = 2;

  private readonly scalingService = inject(PortionScalingService);
  private requestVersion = 0;

  selectedServings = 2;
  displayedIngredients: ScaledIngredient[] = [];
  checkedIngredients: boolean[] = [];
  isCalculating = false;
  errorMessage = '';

  get checkedCount(): number {
    return this.checkedIngredients.filter(Boolean).length;
  }

  get isOriginal(): boolean {
    return this.selectedServings === this.originalServings;
  }

  ngOnInit(): void {
    this.originalServings = this.normalizeServings(this.originalServings);
    this.selectedServings = this.originalServings;
    this.showOriginalIngredients();
  }

  increase(): void {
    if (this.selectedServings >= 100) return;
    this.selectedServings += 1;
    void this.recalculate();
  }

  decrease(): void {
    if (this.selectedServings <= 1) return;
    this.selectedServings -= 1;
    void this.recalculate();
  }

  onServingsChange(value: number | null): void {
    if (value === null || !Number.isFinite(Number(value))) {
      this.reset();
      return;
    }
    this.selectedServings = Math.min(100, Math.max(1, Math.round(Number(value))));
    void this.recalculate();
  }

  reset(): void {
    this.requestVersion += 1;
    this.selectedServings = this.originalServings;
    this.checkedIngredients = [];
    this.isCalculating = false;
    this.errorMessage = '';
    this.showOriginalIngredients();
  }

  private async recalculate(): Promise<void> {
    if (this.isOriginal) {
      this.reset();
      return;
    }

    const currentRequest = ++this.requestVersion;
    this.isCalculating = true;
    this.errorMessage = '';
    try {
      const result = await this.scalingService.scale(this.recipeId, this.selectedServings);
      if (currentRequest !== this.requestVersion) return;
      this.displayedIngredients = result.ingredients;
    } catch {
      if (currentRequest !== this.requestVersion) return;
      this.errorMessage = 'No pudimos recalcular las cantidades. Intenta nuevamente.';
    } finally {
      if (currentRequest === this.requestVersion) this.isCalculating = false;
    }
  }

  private showOriginalIngredients(): void {
    this.displayedIngredients = this.originalIngredients.map((ingredient) => ({
      original: ingredient,
      adjusted: ingredient,
      scalable: false,
    }));
    this.checkedIngredients = this.displayedIngredients.map(() => false);
  }

  private normalizeServings(value: number): number {
    const servings = Number(value);
    return Number.isInteger(servings) && servings >= 1 && servings <= 100 ? servings : 2;
  }
}
