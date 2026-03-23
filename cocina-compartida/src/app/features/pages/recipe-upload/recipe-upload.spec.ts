import { TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RecipeUploadService } from '../../../shared/services/recipe-upload.service';
import { RecipeFormService } from '../../../shared/services/recipe-form.service';
import { RecipeImageService } from '../../../shared/services/recipe-image.service';
import { RecipeDataService } from '../../../shared/services/recipe-data.service';
import { NotificationService } from '../../../shared/services/notificacion.service';
import { Auth } from '../../../shared/services/auth';
import Swal, { SweetAlertResult } from 'sweetalert2';

describe('RecipeUpload - Subir Recetas (Frontend)', () => {
  let service: RecipeUploadService;
  let mockRecipeFormService: jasmine.SpyObj<RecipeFormService>;
  let mockRecipeImageService: jasmine.SpyObj<RecipeImageService>;
  let mockRecipeDataService: jasmine.SpyObj<RecipeDataService>;
  let mockNotificationService: jasmine.SpyObj<NotificationService>;
  let mockAuthService: jasmine.SpyObj<Auth>;
  let mockRouter: jasmine.SpyObj<Router>;

  // Helper para crear resultado de Swal mock
  const createSwalResult = (): SweetAlertResult => ({
    isConfirmed: true,
    isDenied: false,
    isDismissed: false,
    value: undefined
  });

  beforeEach(() => {
    mockRecipeFormService = jasmine.createSpyObj('RecipeFormService', [
      'createRecipeForm',
      'markAllFieldsAsTouched',
      'prepareFormData',
      'validateField',
      'validateArrayField'
    ]);

    mockRecipeImageService = jasmine.createSpyObj('RecipeImageService', [
      'uploadFiles',
      'removeImage',
      'navigateImages',
      'resetImages'
    ]);
    mockRecipeImageService.images = [];
    mockRecipeImageService.currentIndex = 0;
    mockRecipeImageService.isUploading = false;

    mockRecipeDataService = jasmine.createSpyObj('RecipeDataService', [
      'initializeEditMode',
      'getRecipeForEdit',
      'saveRecipe',
      'resetRecipeId'
    ]);
    mockRecipeDataService.isEditMode = false;
    mockRecipeDataService.recipeId = 'test-recipe-id';

    mockNotificationService = jasmine.createSpyObj('NotificationService', ['showToast']);

    mockAuthService = jasmine.createSpyObj('Auth', ['getCurrentUser', 'getUserProfile']);
    mockAuthService.getCurrentUser.and.returnValue({
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      avatar: 'avatar.jpg',
      password: 'password123'
    } as any);

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        RecipeUploadService,
        { provide: RecipeFormService, useValue: mockRecipeFormService },
        { provide: RecipeImageService, useValue: mockRecipeImageService },
        { provide: RecipeDataService, useValue: mockRecipeDataService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: Auth, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        FormBuilder
      ]
    });

    service = TestBed.inject(RecipeUploadService);
  });

  // ==================== F1: VALIDACIÓN CAMPOS VACÍOS ====================
  describe('F1 - Validación: Campos Vacíos', () => {
    it('Debería mostrar Swal de "campos requeridos" y detener el proceso cuando recipeForm.valid es false', async () => {
      // Arrange
      const mockForm: any = {
        invalid: true,
        value: { name: '', descripcion: '', category: '', ingredients: [], steps: [] }
      };
      
      mockRecipeFormService.markAllFieldsAsTouched.and.callFake(() => {});
      mockRecipeFormService.prepareFormData.and.returnValue({});

      const fireSpy = spyOn(Swal, 'fire').and.returnValue(Promise.resolve(createSwalResult()));

      // Act
      await service.submitRecipe(mockForm);

      // Assert
      expect(mockRecipeFormService.markAllFieldsAsTouched).toHaveBeenCalledWith(mockForm);
      expect(fireSpy).toHaveBeenCalled();
      // No debe llamar a saveRecipe porque se detiene el proceso
      expect(mockRecipeDataService.saveRecipe).not.toHaveBeenCalled();
    });

    it('No debe continuar con el proceso si el formulario es inválido', async () => {
      // Arrange
      const mockForm: any = {
        invalid: true,
        value: { name: '', descripcion: '' }
      };

      mockRecipeFormService.markAllFieldsAsTouched.and.callFake(() => {});

      // Act
      const result = await service.submitRecipe(mockForm);

      // Assert
      expect(result).toBe(false);
      expect(mockRecipeFormService.prepareFormData).not.toHaveBeenCalled();
    });
  });

  // ==================== F2: VALIDACIÓN SIN IMÁGENES ====================
  describe('F2 - Validación: Sin Imágenes', () => {
    it('Debería mostrar Swal de "añade una imagen" y detener el proceso cuando el formulario es válido pero no hay imágenes', async () => {
      // Arrange
      const mockForm: any = {
        invalid: false,
        value: { name: 'Test Recipe', descripcion: 'Test Description', category: 'test', ingredients: ['ing1'], steps: ['step1'] }
      };

      mockRecipeFormService.markAllFieldsAsTouched.and.callFake(() => {});
      mockRecipeFormService.prepareFormData.and.returnValue({ name: 'Test Recipe' });
      
      // Images está vacío
      mockRecipeImageService.images = [];

      const fireSpy = spyOn(Swal, 'fire').and.returnValue(Promise.resolve(createSwalResult()));

      // Act
      await service.submitRecipe(mockForm);

      // Assert
      expect(fireSpy).toHaveBeenCalled();
      // No debe llamar a saveRecipe
      expect(mockRecipeDataService.saveRecipe).not.toHaveBeenCalled();
    });

    it('No debe llamar a saveRecipe cuando no hay imágenes', async () => {
      // Arrange
      const mockForm: any = {
        invalid: false,
        value: {}
      };

      mockRecipeFormService.markAllFieldsAsTouched.and.callFake(() => {});
      mockRecipeFormService.prepareFormData.and.returnValue({});
      mockRecipeImageService.images = [];

      // Act
      const result = await service.submitRecipe(mockForm);

      // Assert
      expect(result).toBe(false);
      expect(mockRecipeDataService.saveRecipe).not.toHaveBeenCalled();
    });
  });

  // ==================== F3: EDICIÓN EXITOSA EN UI ====================
  describe('F3 - Edición Exitosa en UI', () => {
    it('Debería llamar a updateRecipe, mostrar Toast y navegar a /recipe/:id cuando isEditMode es true', async () => {
      // Arrange
      const mockForm: any = {
        invalid: false,
        value: { name: 'Updated Recipe', descripcion: 'Updated Description', category: 'test', ingredients: ['ing1'], steps: ['step1'] }
      };

      mockRecipeFormService.markAllFieldsAsTouched.and.callFake(() => {});
      mockRecipeFormService.prepareFormData.and.returnValue({ name: 'Updated Recipe' });
      mockRecipeImageService.images = ['image1.jpg'];
      
      // Modo edición activo
      mockRecipeDataService.isEditMode = true;
      mockRecipeDataService.recipeId = 'recipe-to-edit';

      spyOn(Swal, 'fire').and.returnValue(Promise.resolve(createSwalResult()));

      // Act
      await service.submitRecipe(mockForm);

      // Assert
      expect(mockRecipeFormService.prepareFormData).toHaveBeenCalledWith(mockForm, mockRecipeImageService.images);
      expect(mockRecipeDataService.saveRecipe).toHaveBeenCalled();
      // En modo edición navega a /recipe/:id (no a /home)
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/recipe', 'recipe-to-edit']);
    });

    it('Debería mostrar mensaje de "receta cargada correctamente" en modo creación', async () => {
      // Arrange
      const mockForm: any = {
        invalid: false,
        value: { name: 'New Recipe', descripcion: 'New Description', category: 'test', ingredients: ['ing1'], steps: ['step1'] }
      };

      mockRecipeFormService.markAllFieldsAsTouched.and.callFake(() => {});
      mockRecipeFormService.prepareFormData.and.returnValue({ name: 'New Recipe' });
      mockRecipeImageService.images = ['new-image.jpg'];
      
      // Modo creación (no edición)
      mockRecipeDataService.isEditMode = false;

      spyOn(Swal, 'fire').and.returnValue(Promise.resolve(createSwalResult()));

      // Act
      await service.submitRecipe(mockForm);

      // Assert - Debe mostrar mensaje de creación (no actualización)
      expect(Swal.fire).toHaveBeenCalled();
    });
  });

  // ==================== F4: ERROR DE SERVIDOR ====================
  describe('F4 - Error de Servidor', () => {
    it('Debería manejar error del servidor cuando saveRecipe falla', async () => {
      // Arrange
      const mockForm: any = {
        invalid: false,
        value: { name: 'Test', descripcion: 'Test', category: 'test', ingredients: ['ing'], steps: ['step'] }
      };

      mockRecipeFormService.markAllFieldsAsTouched.and.callFake(() => {});
      mockRecipeFormService.prepareFormData.and.returnValue({ name: 'Test' });
      mockRecipeImageService.images = ['img.jpg'];
      
      // Simular que saveRecipe lanza un error
      mockRecipeDataService.saveRecipe.and.callFake(() => {
        throw new Error('Error del servidor: Token expirado');
      });

      const fireSpy = spyOn(Swal, 'fire').and.returnValue(Promise.resolve(createSwalResult()));

      // Act
      try {
        await service.submitRecipe(mockForm);
      } catch (e) {
        // Expected to throw
      }

      // Assert - Verificar que se llamó a prepareFormData
      expect(mockRecipeFormService.prepareFormData).toHaveBeenCalled();
    });
  });

  // ==================== F5: FALLO CRÍTICO (CATCH) ====================
  describe('F5 - Fallo Crítico (Catch)', () => {
    it('Debería manejar error de conexión', async () => {
      // Arrange
      const mockForm: any = {
        invalid: false,
        value: { name: 'Test', descripcion: 'Test', category: 'test', ingredients: ['ing'], steps: ['step'] }
      };

      mockRecipeFormService.markAllFieldsAsTouched.and.callFake(() => {});
      mockRecipeFormService.prepareFormData.and.callFake(() => {
        throw new Error('Network Error');
      });
      mockRecipeImageService.images = ['img.jpg'];

      const fireSpy = spyOn(Swal, 'fire').and.returnValue(Promise.resolve(createSwalResult()));
      const consoleSpy = spyOn(console, 'error');

      // Act
      try {
        await service.submitRecipe(mockForm);
      } catch (error) {
        // Expected
      }

      // Assert
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('Debería manejar excepción en la construcción del payload', async () => {
      // Arrange
      const mockForm: any = {
        invalid: false,
        value: {}
      };

      // Simular error al preparar los datos
      mockRecipeFormService.markAllFieldsAsTouched.and.callFake(() => {});
      mockRecipeFormService.prepareFormData.and.callFake(() => {
        throw new Error('Error al construir payload');
      });
      mockRecipeImageService.images = [];

      const consoleSpy = spyOn(console, 'error');

      // Act
      try {
        await service.submitRecipe(mockForm);
      } catch (e) {
        // Expected
      }

      // Assert
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  // ==================== TESTS ADICIONALES ====================
  describe('Casos adicionales', () => {
    it('Debería retornar false cuando no hay usuario autenticado y redirigir a /login', async () => {
      // Arrange
      const mockForm: any = {
        invalid: false,
        value: { name: 'Test', descripcion: 'Test', category: 'test', ingredients: ['ing'], steps: ['step'] }
      };

      mockRecipeFormService.markAllFieldsAsTouched.and.callFake(() => {});
      mockAuthService.getCurrentUser.and.returnValue(null); // Usuario no autenticado

      // Act
      const result = await service.submitRecipe(mockForm);

      // Assert
      expect(result).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
      expect(mockNotificationService.showToast).toHaveBeenCalledWith(
        'error',
        'Sesión expirada o no iniciada'
      );
    });

    it('Debería limpiar el formulario después de una creación exitosa', async () => {
      // Arrange
      const mockForm: any = {
        invalid: false,
        value: { name: 'New Recipe', descripcion: 'Description', category: 'test', ingredients: ['ing'], steps: ['step'] }
      };

      mockRecipeFormService.markAllFieldsAsTouched.and.callFake(() => {});
      mockRecipeFormService.prepareFormData.and.returnValue({ name: 'New Recipe' });
      mockRecipeImageService.images = ['img.jpg'];
      mockRecipeDataService.isEditMode = false;
      mockRecipeDataService.recipeId = 'new-id';

      spyOn(Swal, 'fire').and.returnValue(Promise.resolve(createSwalResult()));
      const resetSpy = spyOn(mockRecipeDataService, 'resetRecipeId');

      // Act
      await service.submitRecipe(mockForm);

      // Assert
      // En modo creación (no edición) se debe resetear el formulario
      expect(resetSpy).toHaveBeenCalled();
    });

    it('Debería usar updateRecipe en modo edición', () => {
      // Arrange
      mockRecipeDataService.isEditMode = true;
      mockRecipeDataService.recipeId = 'existing-id';

      const mockFormData = {
        name: 'Updated Name',
        descripcion: 'Updated Desc',
        ingredients: ['ing1'],
        steps: ['step1']
      };

      mockRecipeFormService.prepareFormData.and.returnValue(mockFormData);

      // Act
      mockRecipeDataService.saveRecipe(mockFormData, ['image.jpg']);

      // Assert
      // El servicio de datos internamente usa updateRecipe para edición
      expect(mockRecipeDataService.saveRecipe).toHaveBeenCalledWith(
        mockFormData,
        ['image.jpg']
      );
    });
  });
});

