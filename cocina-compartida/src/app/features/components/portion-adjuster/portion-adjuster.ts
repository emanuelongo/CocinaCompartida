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

  getIngredientText(item: any): string {
    if (!item) return '';
    if (typeof item === 'string') {
      try {
        const parsed = JSON.parse(item);
        if (parsed && typeof parsed === 'object') {
          return this.formatIngredientItem(parsed);
        }
      } catch {}
      return item;
    }
    return this.formatIngredientItem(item);
  }

  private formatIngredientItem(item: any): string {
    const name = item.nombre || item.name || '';
    if (item.cantidad !== undefined && item.cantidad !== null && item.cantidad !== '') {
      const unit = item.unidad === 'otros' ? item.otraUnidad || '' : item.unidad || '';
      const unitStr = unit ? ` ${unit} de ` : ' ';
      return `${item.cantidad}${unitStr}${name}`.trim();
    }
    return name;
  }

  getIngredientImportance(item: any): string {
    const raw = item?.original ?? item?.adjusted ?? item;
    if (!raw) return '';
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.importancia) {
          return parsed.importancia;
        }
      } catch {}
      return '';
    }
    return raw.importancia || '';
  }

  getIngredientReplacement(item: any): string {
    const raw = item?.original ?? item?.adjusted ?? item;
    if (!raw) return '';
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.reemplazo) {
          return parsed.reemplazo;
        }
      } catch {}
      return '';
    }
    return raw.reemplazo || '';
  }

  getImportanceLabel(imp: string): string {
    switch (imp) {
      case 'obligatorio': return '⭐ Obligatorio';
      case 'opcional': return '✨ Opcional';
      case 'reemplazable': return '🔄 Reemplazable';
      default: return '';
    }
  }

  private showOriginalIngredients(): void {
    this.displayedIngredients = this.originalIngredients.map((ingredient) => {
      const text = this.getIngredientText(ingredient);
      return {
        original: ingredient,
        adjusted: text,
        scalable: false,
      };
    });
    this.checkedIngredients = this.displayedIngredients.map(() => false);
  }

  private normalizeServings(value: number): number {
    const servings = Number(value);
    return Number.isInteger(servings) && servings >= 1 && servings <= 100 ? servings : 2;
  }
}