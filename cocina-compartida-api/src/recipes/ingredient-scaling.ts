export interface ScaledIngredient {
  original: string;
  adjusted: string;
  originalQuantity?: number;
  adjustedQuantity?: number;
  unit?: string;
  scalable: boolean;
}

export interface ScaledIngredientsResult {
  originalServings: number;
  selectedServings: number;
  scaleFactor: number;
  ingredients: ScaledIngredient[];
}

const UNICODE_FRACTIONS: Record<string, string> = {
  '¼': '1/4',
  '½': '1/2',
  '¾': '3/4',
  '⅓': '1/3',
  '⅔': '2/3',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8',
};

const UNIT_PATTERN =
  /^(kg|kilogramos?|g|gramos?|mg|miligramos?|ml|mililitros?|l|litros?|tazas?|tzs?|cucharadas?|cdas?|cda|cucharaditas?|cdtas?|cdta)\.?\b/i;

function normalizeFractions(value: string): string {
  return value
    .replace(/(\d)([¼½¾⅓⅔⅛⅜⅝⅞])/g, '$1 $2')
    .replace(/[¼½¾⅓⅔⅛⅜⅝⅞]/g, (fraction) => UNICODE_FRACTIONS[fraction]);
}

function parseFraction(value: string): number | null {
  const [numerator, denominator] = value.split('/').map(Number);
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator === 0
  ) {
    return null;
  }
  return numerator / denominator;
}

function parseLeadingQuantity(
  value: string,
): { quantity: number; length: number } | null {
  const normalized = normalizeFractions(value);
  const mixed = normalized.match(/^\s*(\d+(?:[.,]\d+)?)\s+(\d+\/\d+)/);
  if (mixed) {
    const fraction = parseFraction(mixed[2]);
    if (fraction === null) return null;
    return {
      quantity: Number(mixed[1].replace(',', '.')) + fraction,
      length: mixed[0].length,
    };
  }

  const fraction = normalized.match(/^\s*(\d+\/\d+)/);
  if (fraction) {
    const quantity = parseFraction(fraction[1]);
    return quantity === null ? null : { quantity, length: fraction[0].length };
  }

  const decimal = normalized.match(/^\s*(\d+(?:[.,]\d+)?)/);
  if (!decimal) return null;
  return {
    quantity: Number(decimal[1].replace(',', '.')),
    length: decimal[0].length,
  };
}

function canonicalUnit(unit: string, quantity: number): string {
  const normalized = unit.toLowerCase().replace('.', '');
  if (/^(kg|kilogramo)/.test(normalized)) return 'kg';
  if (/^(g|gramo)/.test(normalized)) return 'g';
  if (/^(mg|miligramo)/.test(normalized)) return 'mg';
  if (/^(ml|mililitro)/.test(normalized)) return 'ml';
  if (/^(l|litro)/.test(normalized)) return 'l';
  if (/^(taza|tz)/.test(normalized)) return quantity === 1 ? 'taza' : 'tazas';
  if (/^(cucharadita|cdta)/.test(normalized)) {
    return quantity === 1 ? 'cucharadita' : 'cucharaditas';
  }
  return quantity === 1 ? 'cucharada' : 'cucharadas';
}

function formatQuantity(value: number): string {
  const rounded = Math.round((value + Number.EPSILON) * 100) / 100;
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(rounded);
}

export function scaleIngredient(
  ingredient: string,
  scaleFactor: number,
): ScaledIngredient {
  const parsed = parseLeadingQuantity(ingredient);
  if (!parsed || !Number.isFinite(scaleFactor) || scaleFactor <= 0) {
    return { original: ingredient, adjusted: ingredient, scalable: false };
  }

  const normalized = normalizeFractions(ingredient);
  let remainder = normalized.slice(parsed.length).trimStart();
  if (/^(?:-|–|—|a\s)/i.test(remainder)) {
    return { original: ingredient, adjusted: ingredient, scalable: false };
  }

  const unitMatch = remainder.match(UNIT_PATTERN);
  const adjustedQuantity = parsed.quantity * scaleFactor;
  let unit: string | undefined;
  if (unitMatch) {
    unit = canonicalUnit(unitMatch[1], adjustedQuantity);
    remainder = remainder.slice(unitMatch[0].length).trimStart();
  }

  const adjusted = [formatQuantity(adjustedQuantity), unit, remainder]
    .filter(Boolean)
    .join(' ');

  return {
    original: ingredient,
    adjusted,
    originalQuantity: parsed.quantity,
    adjustedQuantity:
      Math.round((adjustedQuantity + Number.EPSILON) * 100) / 100,
    unit,
    scalable: true,
  };
}

export function scaleIngredients(
  ingredients: string[],
  originalServings: number,
  selectedServings: number,
): ScaledIngredientsResult {
  const scaleFactor = selectedServings / originalServings;
  return {
    originalServings,
    selectedServings,
    scaleFactor,
    ingredients: ingredients.map((ingredient) =>
      scaleIngredient(ingredient, scaleFactor),
    ),
  };
}