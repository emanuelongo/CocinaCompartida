import { Injectable, inject } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';

@Injectable({
  providedIn: 'root',
})
export class RecipeFormService {
  private fb = inject(FormBuilder);

  static meaningfulText(control: AbstractControl): ValidationErrors | null {
    const val = (control.value ?? '').trim();
    if (!val) return null;
    const hasLetter = /[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(val);
    return hasLetter ? null : { meaningfulText: true };
  }

  createIngredientGroup(
    nombre = '',
    cantidadOrImportancia: any = '',
    unidadOrReemplazo: any = 'g',
    otraUnidad = '',
    importancia = 'obligatorio',
    reemplazo = ''
  ): FormGroup {
    let cant: number | string = '';
    let unit = 'g';
    let customUnit = otraUnidad;
    let imp = importancia || 'obligatorio';
    let repl = reemplazo;

    // Soporte retrocompatible si se llama con (nombre, importancia, reemplazo)
    if (
      cantidadOrImportancia === 'obligatorio' ||
      cantidadOrImportancia === 'opcional' ||
      cantidadOrImportancia === 'reemplazable'
    ) {
      imp = cantidadOrImportancia;
      repl = typeof unidadOrReemplazo === 'string' ? unidadOrReemplazo : '';
      unit = 'g';
      cant = '';
    } else {
      cant =
        cantidadOrImportancia !== '' &&
        cantidadOrImportancia !== null &&
        cantidadOrImportancia !== undefined
          ? cantidadOrImportancia
          : '';
      unit = typeof unidadOrReemplazo === 'string' && unidadOrReemplazo ? unidadOrReemplazo : 'g';
    }

    const group = this.fb.group({
      nombre: [nombre, [Validators.required, RecipeFormService.meaningfulText]],
      cantidad: [
        cant,
        [
          Validators.required,
          Validators.min(0.01),
          Validators.max(9999),
          Validators.pattern(/^(\d+(\.\d+)?)$/),
        ],
      ],
      unidad: [unit || 'g', [Validators.required]],
      otraUnidad: [customUnit],
      importancia: [imp],
      reemplazo: [repl],
    });

    const originalSetValue = group.setValue.bind(group);
    group.setValue = (value: any, options?: any) => {
      if (typeof value === 'string') {
        return originalSetValue(
          {
            nombre: value,
            cantidad: 1,
            unidad: 'g',
            otraUnidad: '',
            importancia: 'obligatorio',
            reemplazo: '',
          },
          options,
        );
      }
      return originalSetValue(
        {
          nombre: value?.nombre ?? value?.name ?? '',
          cantidad:
            value?.cantidad !== undefined && value?.cantidad !== null && value?.cantidad !== ''
              ? value.cantidad
              : 1,
          unidad: value?.unidad ?? 'g',
          otraUnidad: value?.otraUnidad ?? '',
          importancia: value?.importancia ?? 'obligatorio',
          reemplazo: value?.reemplazo ?? '',
        },
        options,
      );
    };

    return group;
  }

  createRecipeForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), RecipeFormService.meaningfulText]],
      descripcion: [
        '',
        [Validators.required, Validators.minLength(10), RecipeFormService.meaningfulText],
      ],
      category: ['', [Validators.required]],
      servings: [
        2,
        [Validators.required, Validators.min(1), Validators.max(100), Validators.pattern(/^\d+$/)],
      ],
      ingredients: this.fb.array([this.createIngredientGroup()]),
      steps: this.fb.array([
        this.fb.control('', [Validators.required, RecipeFormService.meaningfulText]),
      ]),
    });
  }

  clearAndLoadFormArray(formArray: FormArray, items: any[]): void {
    formArray.clear();
    items.forEach((item) => {
      if (typeof item === 'string') {
        try {
          const parsed = JSON.parse(item);
          if (parsed && typeof parsed === 'object') {
            formArray.push(
              this.createIngredientGroup(
                parsed.nombre ?? parsed.name ?? '',
                parsed.cantidad ?? '',
                parsed.unidad ?? 'g',
                parsed.otraUnidad ?? '',
                parsed.importancia ?? 'obligatorio',
                parsed.reemplazo ?? '',
              ),
            );
            return;
          }
        } catch {}
        // Compatibilidad con recetas guardadas en formato antiguo de solo texto
        formArray.push(this.createIngredientGroup(item, '', 'g', '', 'obligatorio', ''));
      } else if (item && typeof item === 'object') {
        formArray.push(
          this.createIngredientGroup(
            item.nombre ?? item.name ?? '',
            item.cantidad ?? '',
            item.unidad ?? 'g',
            item.otraUnidad ?? '',
            item.importancia ?? 'obligatorio',
            item.reemplazo ?? '',
          ),
        );
      } else {
        formArray.push(this.createIngredientGroup());
      }
    });
  }

  clearAndLoadStepsArray(formArray: FormArray, items: string[]): void {
    formArray.clear();
    items.forEach((item) => formArray.push(this.fb.control(item, Validators.required)));
  }

  addFormArrayItem(formArray: FormArray, isIngredient = false): void {
    const isIng = isIngredient || (formArray.length > 0 && formArray.at(0) instanceof FormGroup);
    if (isIng) {
      formArray.push(this.createIngredientGroup());
    } else {
      formArray.push(this.fb.control('', [Validators.required, RecipeFormService.meaningfulText]));
    }
  }

  removeFormArrayItem(formArray: FormArray, index: number, minItems: number = 1): boolean {
    if (formArray.length <= minItems) {
      return false;
    }
    formArray.removeAt(index);
    return true;
  }

  markAllFieldsAsTouched(form: FormGroup): void {
    Object.keys(form.controls).forEach((key) => {
      const control = form.get(key);
      if (control instanceof FormArray) {
        control.controls.forEach((arrayControl) => {
          arrayControl.markAsTouched();
        });
      } else {
        control?.markAsTouched();
      }
    });
  }

  validateField(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return field ? field.invalid && field.touched : false;
  }

  validateArrayField(formArray: FormArray, index: number): boolean {
    const control = formArray.at(index);
    if (!control) return false;
    if (control instanceof FormGroup) {
      const nombreCtrl = control.get('nombre');
      const cantidadCtrl = control.get('cantidad');
      const unidadCtrl = control.get('unidad');
      const otraUnidadCtrl = control.get('otraUnidad');

      const isNombreInvalid = !!(
        nombreCtrl &&
        nombreCtrl.invalid &&
        (nombreCtrl.touched || control.touched)
      );
      const isCantidadInvalid = !!(
        cantidadCtrl &&
        cantidadCtrl.invalid &&
        (cantidadCtrl.touched || control.touched)
      );
      const isOtraUnidadInvalid = !!(
        unidadCtrl?.value === 'otros' &&
        otraUnidadCtrl &&
        (!otraUnidadCtrl.value || otraUnidadCtrl.invalid) &&
        (otraUnidadCtrl.touched || control.touched)
      );

      return isNombreInvalid || isCantidadInvalid || isOtraUnidadInvalid;
    }
    return control.invalid && control.touched;
  }

  prepareFormData(form: FormGroup, images: string[]): any {
    const rawIngredients = (form.value.ingredients as any[]) || [];
    const filteredIngredients = rawIngredients
      .filter((ing: any) => {
        if (!ing) return false;
        if (typeof ing === 'string') return ing.trim() !== '';
        return typeof ing.nombre === 'string' && ing.nombre.trim() !== '';
      })
      .map((ing: any) => {
        if (typeof ing === 'string') {
          return {
            nombre: ing.trim(),
            cantidad: '',
            unidad: 'g',
            otraUnidad: '',
            importancia: 'obligatorio',
            reemplazo: '',
          };
        }
        const importancia = ing.importancia || 'obligatorio';
        const unidad = ing.unidad || 'g';
        const rawCantidad = ing.cantidad;
        const parsedCantidad =
          rawCantidad !== undefined && rawCantidad !== null && rawCantidad !== ''
            ? Number(rawCantidad)
            : '';
        return {
          nombre: (ing.nombre ?? '').trim(),
          cantidad: parsedCantidad,
          unidad: unidad,
          otraUnidad: unidad === 'otros' ? (ing.otraUnidad ?? '').trim() : '',
          importancia: importancia,
          reemplazo: importancia === 'reemplazable' ? (ing.reemplazo ?? '').trim() : '',
        };
      });
    const filteredSteps = ((form.value.steps as string[]) || []).filter(
      (step: string) => step?.trim() !== '',
    );

    return {
      name: (form.value.name ?? '').trim(),
      descripcion: (form.value.descripcion ?? '').trim(),
      category: form.value.category,
      servings: Number(form.value.servings) || 2,
      ingredients: filteredIngredients,
      steps: filteredSteps,
      images: images,
    };
  }
}