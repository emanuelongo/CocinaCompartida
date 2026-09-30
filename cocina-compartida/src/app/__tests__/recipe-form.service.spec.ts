import { TestBed } from '@angular/core/testing';
import { RecipeFormService } from '../shared/services/recipe-form.service';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  RECIPE FORM SERVICE – Pruebas Unitarias (Patrón AAA)
//  Funcionalidad: Creación y validación de formularios de recetas
//
//  Tipos de Mocks: Dummy (datos de formulario), Stub (valores form)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('RecipeFormService – Pruebas Unitarias', () => {
  let service: RecipeFormService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [RecipeFormService, FormBuilder]
    });
    service = TestBed.inject(RecipeFormService);
  });

  // ──────────── Creación de formulario ────────────
  describe('createRecipeForm', () => {
    it('RF-01: crea formulario con todos los campos requeridos (Dummy)', () => {
      // Arrange & Act
      const form = service.createRecipeForm();

      // Assert
      expect(form.get('name')).toBeTruthy();
      expect(form.get('descripcion')).toBeTruthy();
      expect(form.get('category')).toBeTruthy();
      expect(form.get('ingredients')).toBeTruthy();
      expect(form.get('steps')).toBeTruthy();
    });

    it('RF-02: formulario inicia como inválido (campos vacíos)', () => {
      // Arrange & Act
      const form = service.createRecipeForm();

      // Assert
      expect(form.valid).toBeFalse();
    });

    it('RF-03: ingredients inicia con 1 control vacío', () => {
      // Arrange & Act
      const form = service.createRecipeForm();
      const ingredients = form.get('ingredients') as FormArray;

      // Assert
      expect(ingredients.length).toBe(1);
    });

    it('RF-04: steps inicia con 1 control vacío', () => {
      // Arrange & Act
      const form = service.createRecipeForm();
      const steps = form.get('steps') as FormArray;

      // Assert
      expect(steps.length).toBe(1);
    });

    it('RF-05: name tiene validator required y minLength(2)', () => {
      // Arrange
      const form = service.createRecipeForm();
      const nameControl = form.get('name')!;

      // Act
      nameControl.setValue('');
      expect(nameControl.hasError('required')).toBeTrue();

      nameControl.setValue('A');
      expect(nameControl.hasError('minlength')).toBeTrue();

      nameControl.setValue('AB');
      // Assert
      expect(nameControl.valid).toBeTrue();
    });

    it('RF-06: descripcion requiere minLength(10)', () => {
      // Arrange
      const form = service.createRecipeForm();
      const desc = form.get('descripcion')!;

      // Act
      desc.setValue('corta');

      // Assert
      expect(desc.hasError('minlength')).toBeTrue();

      desc.setValue('descripción larga suficiente');
      expect(desc.valid).toBeTrue();
    });
  });

  // ──────────── clearAndLoadFormArray ────────────
  describe('clearAndLoadFormArray', () => {
    it('RF-07: limpia y carga items correctamente (Dummy)', () => {
      // Arrange
      const form = service.createRecipeForm();
      const ingredients = form.get('ingredients') as FormArray;

      // Act
      service.clearAndLoadFormArray(ingredients, ['arroz', 'pollo', 'sal']);

      // Assert
      expect(ingredients.length).toBe(3);
      expect(ingredients.at(0).value.nombre).toBe('arroz');
      expect(ingredients.at(2).value.nombre).toBe('sal');
    });

    it('RF-08: limpia array existente antes de cargar', () => {
      // Arrange
      const form = service.createRecipeForm();
      const ingredients = form.get('ingredients') as FormArray;
      service.addFormArrayItem(ingredients);
      service.addFormArrayItem(ingredients);
      expect(ingredients.length).toBe(3); // 1 original + 2 nuevos

      // Act
      service.clearAndLoadFormArray(ingredients, ['solo_uno']);

      // Assert
      expect(ingredients.length).toBe(1);
    });
  });

  // ──────────── addFormArrayItem / removeFormArrayItem ────────────
  describe('addFormArrayItem / removeFormArrayItem', () => {
    it('RF-09: addFormArrayItem agrega un control vacío', () => {
      // Arrange
      const form = service.createRecipeForm();
      const steps = form.get('steps') as FormArray;

      // Act
      service.addFormArrayItem(steps);

      // Assert
      expect(steps.length).toBe(2);
      expect(steps.at(1).value).toBe('');
    });

    it('RF-10: removeFormArrayItem elimina el item del índice', () => {
      // Arrange
      const form = service.createRecipeForm();
      const steps = form.get('steps') as FormArray;
      service.addFormArrayItem(steps);
      steps.at(0).setValue('paso 1');
      steps.at(1).setValue('paso 2');

      // Act
      const result = service.removeFormArrayItem(steps, 0, 1);

      // Assert
      expect(result).toBeTrue();
      expect(steps.length).toBe(1);
      expect(steps.at(0).value).toBe('paso 2');
    });

    it('RF-11: removeFormArrayItem retorna false si solo queda el mínimo', () => {
      // Arrange
      const form = service.createRecipeForm();
      const steps = form.get('steps') as FormArray;
      // Solo hay 1 step (el mínimo)

      // Act
      const result = service.removeFormArrayItem(steps, 0, 1);

      // Assert
      expect(result).toBeFalse();
      expect(steps.length).toBe(1);
    });

    it('RF-12: removeFormArrayItem respeta minItems personalizado', () => {
      // Arrange
      const form = service.createRecipeForm();
      const steps = form.get('steps') as FormArray;
      service.addFormArrayItem(steps);
      // Ahora hay 2

      // Act
      const result = service.removeFormArrayItem(steps, 0, 2);

      // Assert
      expect(result).toBeFalse(); // 2 <= 2, no puede remover
    });
  });

  // ──────────── markAllFieldsAsTouched ────────────
  describe('markAllFieldsAsTouched', () => {
    it('RF-13: marca todos los campos como touched', () => {
      // Arrange
      const form = service.createRecipeForm();

      // Act
      service.markAllFieldsAsTouched(form);

      // Assert
      expect(form.get('name')!.touched).toBeTrue();
      expect(form.get('descripcion')!.touched).toBeTrue();
      expect(form.get('category')!.touched).toBeTrue();
    });

    it('RF-14: marca controles de FormArray como touched', () => {
      // Arrange
      const form = service.createRecipeForm();
      const ingredients = form.get('ingredients') as FormArray;

      // Act
      service.markAllFieldsAsTouched(form);

      // Assert
      expect(ingredients.at(0).touched).toBeTrue();
    });
  });

  // ──────────── validateField / validateArrayField ────────────
  describe('validateField / validateArrayField', () => {
    it('RF-15: validateField retorna true si campo inválido y tocado', () => {
      // Arrange
      const form = service.createRecipeForm();
      form.get('name')!.markAsTouched();

      // Act
      const result = service.validateField(form, 'name');

      // Assert
      expect(result).toBeTrue(); // nombre vacío + touched = inválido visible
    });

    it('RF-16: validateField retorna false si campo no tocado', () => {
      // Arrange
      const form = service.createRecipeForm();

      // Act
      const result = service.validateField(form, 'name');

      // Assert
      expect(result).toBeFalse();
    });

    it('RF-17: validateField retorna false si campo válido y tocado', () => {
      // Arrange
      const form = service.createRecipeForm();
      form.get('name')!.setValue('Pizza');
      form.get('name')!.markAsTouched();

      // Act
      const result = service.validateField(form, 'name');

      // Assert
      expect(result).toBeFalse();
    });

    it('RF-18: validateField retorna false si campo no existe', () => {
      // Arrange
      const form = service.createRecipeForm();

      // Act
      const result = service.validateField(form, 'nonexistent');

      // Assert
      expect(result).toBeFalse();
    });

    it('RF-19: validateArrayField retorna true si item inválido y tocado', () => {
      // Arrange
      const form = service.createRecipeForm();
      const ingredients = form.get('ingredients') as FormArray;
      ingredients.at(0).markAsTouched();

      // Act
      const result = service.validateArrayField(ingredients, 0);

      // Assert
      expect(result).toBeTrue();
    });

    it('RF-20: validateArrayField retorna false si item válido', () => {
      // Arrange
      const form = service.createRecipeForm();
      const ingredients = form.get('ingredients') as FormArray;
      ingredients.at(0).setValue('arroz');
      ingredients.at(0).markAsTouched();

      // Act
      const result = service.validateArrayField(ingredients, 0);

      // Assert
      expect(result).toBeFalse();
    });
  });

  // ──────────── prepareFormData ────────────
  describe('prepareFormData', () => {
    it('RF-21: prepara datos limpiando espacios y filtrando vacíos (Dummy)', () => {
      // Arrange
      const form = service.createRecipeForm();
      form.get('name')!.setValue('  Pizza  ');
      form.get('descripcion')!.setValue('  Desc larga test  ');
      form.get('category')!.setValue('Italiana');
      const ingredients = form.get('ingredients') as FormArray;
      ingredients.at(0).setValue('arroz');
      service.addFormArrayItem(ingredients);
      const group2 = ingredients.at(1) as FormGroup;
      group2.get('nombre')?.setValue('');
      const steps = form.get('steps') as FormArray;
      steps.at(0).setValue('cocinar');

      // Act
      const result = service.prepareFormData(form, ['img1.jpg']);

      // Assert
      expect(result.name).toBe('Pizza');
      expect(result.descripcion).toBe('Desc larga test');
      expect(result.category).toBe('Italiana');
      expect(result.ingredients.length).toBe(1);
      expect(result.ingredients[0].nombre).toBe('arroz');
      expect(result.steps).toEqual(['cocinar']);
      expect(result.images).toEqual(['img1.jpg']);
    });

    it('RF-22: retorna arrays vacíos si todos los items están vacíos', () => {
      // Arrange
      const form = service.createRecipeForm();
      form.get('name')!.setValue('Test');
      form.get('descripcion')!.setValue('Descripción');
      form.get('category')!.setValue('X');

      // Act
      const result = service.prepareFormData(form, []);

      // Assert
      expect(result.ingredients).toEqual([]);
      expect(result.steps).toEqual([]);
      expect(result.images).toEqual([]);
    });
  });

  // ──────────── Validaciones de Cantidad y Unidades de Ingredientes ────────────
  describe('Validaciones de Cantidad y Unidades de Ingredientes (Requerimiento de Usuario)', () => {
    it('VAL-01: cantidad no permite letras ni caracteres especiales', () => {
      const group = service.createIngredientGroup('Harina');
      const cantidadCtrl = group.get('cantidad')!;

      // Con letras
      cantidadCtrl.setValue('abc');
      expect(cantidadCtrl.valid).toBeFalse();
      expect(cantidadCtrl.errors?.['pattern']).toBeTruthy();

      cantidadCtrl.setValue('10g');
      expect(cantidadCtrl.valid).toBeFalse();
      expect(cantidadCtrl.errors?.['pattern']).toBeTruthy();

      cantidadCtrl.setValue('veinte');
      expect(cantidadCtrl.valid).toBeFalse();
      expect(cantidadCtrl.errors?.['pattern']).toBeTruthy();

      cantidadCtrl.setValue('12#4');
      expect(cantidadCtrl.valid).toBeFalse();
      expect(cantidadCtrl.errors?.['pattern']).toBeTruthy();
    });

    it('VAL-02: cantidad no permite números demasiado grandes (> 9999)', () => {
      const group = service.createIngredientGroup('Harina');
      const cantidadCtrl = group.get('cantidad')!;

      cantidadCtrl.setValue(10000);
      expect(cantidadCtrl.valid).toBeFalse();
      expect(cantidadCtrl.errors?.['max']).toBeTruthy();

      cantidadCtrl.setValue(999999);
      expect(cantidadCtrl.valid).toBeFalse();
      expect(cantidadCtrl.errors?.['max']).toBeTruthy();
    });

    it('VAL-03: cantidad no permite valores menores o iguales a 0', () => {
      const group = service.createIngredientGroup('Harina');
      const cantidadCtrl = group.get('cantidad')!;

      cantidadCtrl.setValue(0);
      expect(cantidadCtrl.valid).toBeFalse();
      expect(cantidadCtrl.errors?.['min']).toBeTruthy();

      cantidadCtrl.setValue(-5);
      expect(cantidadCtrl.valid).toBeFalse();
      expect(cantidadCtrl.errors?.['min']).toBeTruthy();
    });

    it('VAL-04: cantidad permite números válidos (enteros y decimales)', () => {
      const group = service.createIngredientGroup('Harina');
      const cantidadCtrl = group.get('cantidad')!;

      cantidadCtrl.setValue(250);
      expect(cantidadCtrl.valid).toBeTrue();

      cantidadCtrl.setValue(1.5);
      expect(cantidadCtrl.valid).toBeTrue();

      cantidadCtrl.setValue(0.5);
      expect(cantidadCtrl.valid).toBeTrue();

      cantidadCtrl.setValue(9999);
      expect(cantidadCtrl.valid).toBeTrue();
    });

    it('VAL-05: permite seleccionar unidades de peso (g, kg)', () => {
      const groupG = service.createIngredientGroup('Harina', 200, 'g');
      expect(groupG.get('unidad')!.value).toBe('g');
      expect(groupG.valid).toBeTrue();

      const groupKg = service.createIngredientGroup('Arroz', 2, 'kg');
      expect(groupKg.get('unidad')!.value).toBe('kg');
      expect(groupKg.valid).toBeTrue();
    });

    it('VAL-06: permite seleccionar unidades de volumen (ml, L, cdta, cda, taza)', () => {
      const volumenes = ['ml', 'L', 'cdta', 'cda', 'taza'];
      volumenes.forEach((u) => {
        const group = service.createIngredientGroup('Ingrediente', 10, u);
        expect(group.get('unidad')!.value).toBe(u);
        expect(group.valid).toBeTrue();
      });
    });

    it('VAL-07: permite opcion otros y registra unidad personalizada en prepareFormData', () => {
      const form = service.createRecipeForm();
      form.get('name')!.setValue('Sopa deliciosa');
      form.get('descripcion')!.setValue('Una sopa tradicional muy rica');
      form.get('category')!.setValue('Almuerzo');

      const ingredients = form.get('ingredients') as FormArray;
      ingredients.clear();
      ingredients.push(
        service.createIngredientGroup('Cilantro fresco', 2, 'otros', 'ramas', 'obligatorio', ''),
      );

      const steps = form.get('steps') as FormArray;
      steps.at(0).setValue('Hervir los ingredientes en agua');

      const data = service.prepareFormData(form, ['sopa.jpg']);

      expect(data.ingredients.length).toBe(1);
      expect(data.ingredients[0].nombre).toBe('Cilantro fresco');
      expect(data.ingredients[0].cantidad).toBe(2);
      expect(data.ingredients[0].unidad).toBe('otros');
      expect(data.ingredients[0].otraUnidad).toBe('ramas');
      expect(data.ingredients[0].importancia).toBe('obligatorio');
    });
  });
});
