export interface ScaledIngredient {
  original: string;
  adjusted: string;
  originalQuantity?: number;
  adjustedQuantity?: number;
  unit?: string;
  scalable: boolean;
  importancia?: string;
  reemplazo?: string;
}

export interface ScaledIngredientsResult {
  recipeId: string;
  originalServings: number;
  selectedServings: number;
  scaleFactor: number;
  ingredients: ScaledIngredient[];
}
