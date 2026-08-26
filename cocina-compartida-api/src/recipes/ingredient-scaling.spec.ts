import { scaleIngredient, scaleIngredients } from './ingredient-scaling';

describe('Ingredient scaling', () => {
  it.each([
    ['200 g de pasta', 2.5, '500 g de pasta'],
    ['250 ml de leche', 2.5, '625 ml de leche'],
    ['1 taza de arroz', 2.5, '2,5 tazas de arroz'],
    ['2 cucharadas de aceite', 2.5, '5 cucharadas de aceite'],
    ['1/2 taza de azúcar', 2.5, '1,25 tazas de azúcar'],
    ['1½ tazas de harina', 2, '3 tazas de harina'],
    ['1kg de carne', 2.5, '2,5 kg de carne'],
  ])('escala %s correctamente', (ingredient, factor, expected) => {
    expect(scaleIngredient(ingredient, factor).adjusted).toBe(expected);
  });

  it('conserva ingredientes sin cantidad', () => {
    expect(scaleIngredient('Sal al gusto', 2.5)).toEqual({
      original: 'Sal al gusto',
      adjusted: 'Sal al gusto',
      scalable: false,
    });
  });

  it('no interpreta rangos de manera incorrecta', () => {
    expect(scaleIngredient('2-3 cucharadas de agua', 2).adjusted).toBe(
      '2-3 cucharadas de agua',
    );
  });

  it('calcula el factor y no modifica la lista original', () => {
    const ingredients = ['200 g de pasta', 'Sal al gusto'];
    const result = scaleIngredients(ingredients, 2, 5);

    expect(result.scaleFactor).toBe(2.5);
    expect(result.ingredients.map((item) => item.adjusted)).toEqual([
      '500 g de pasta',
      'Sal al gusto',
    ]);
    expect(ingredients).toEqual(['200 g de pasta', 'Sal al gusto']);
  });
});