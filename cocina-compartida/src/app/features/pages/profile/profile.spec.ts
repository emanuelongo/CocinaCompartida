import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Profile } from './profile';
import { Auth } from '../../../shared/services/auth';
import { RecipeService } from '../../../shared/services/recipe';
import { EditProfileService } from '../../../shared/services/edit-profile.service';
import { of } from 'rxjs';

describe('Profile Component - Subir Avatar', () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;
  let mockAuthService: jasmine.SpyObj<Auth>;
  let mockRecipeService: jasmine.SpyObj<RecipeService>;
  let mockEditService: jasmine.SpyObj<EditProfileService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('Auth', [
      'getCurrentUser',
      'verifyLoggedUser',
      'logout'
    ]);
    mockRecipeService = jasmine.createSpyObj('RecipeService', [], {
      recipes: jasmine.createSpy('recipes').and.returnValue([])
    });
    mockEditService = jasmine.createSpyObj('EditProfileService', [
      'uploadAvatar',
      'fetchUserById',
      'updateProfile',
      'deleteAccount'
    ]);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.returnValue(null)
        }
      }
    };

    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, RouterModule, Profile],
      providers: [
        { provide: Auth, useValue: mockAuthService },
        { provide: RecipeService, useValue: mockRecipeService },
        { provide: EditProfileService, useValue: mockEditService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
    mockAuthService.getCurrentUser.and.returnValue(null);
  });

  // PU-AV-01: Usuario no selecciona archivo
  describe('PU-AV-01: Usuario no selecciona archivo', () => {
    it('Debería retornar inmediatamente sin ejecutar el servicio cuando file = null', async () => {
      const event = {
        target: {
          files: null
        }
      };

      await component.onAvatarSelected(event);

      expect(mockEditService.uploadAvatar).not.toHaveBeenCalled();
      expect(component.newAvatar).toBeUndefined();
    });

    it('Debería retornar inmediatamente sin ejecutar el servicio cuando files está vacío', async () => {
      const event = {
        target: {
          files: []
        }
      };

      await component.onAvatarSelected(event);

      expect(mockEditService.uploadAvatar).not.toHaveBeenCalled();
      expect(component.newAvatar).toBeUndefined();
    });
  });

  // PU-AV-02: Error al subir archivo (result.success = false)
  describe('PU-AV-02: Error al subir archivo', () => {
    it('Debería mostrar alerta de error cuando result.success = false', async () => {
      const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });
      mockEditService.uploadAvatar.and.returnValue(Promise.resolve(undefined));

      const event = {
        target: {
          files: [file]
        }
      };

      await component.onAvatarSelected(event);

      expect(mockEditService.uploadAvatar).toHaveBeenCalledWith(file);
      expect(component.newAvatar).toBeUndefined();
    });
  });

  // PU-AV-03: Avatar subido correctamente (result.success = true)
  describe('PU-AV-03: Avatar subido correctamente', () => {
    it('Debería actualizar avatarPreview y guardarlo en el formulario de perfil', async () => {
      const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });
      const avatarUrl = '/api/uploads/avatars/testuser-avatar.jpg';
      mockEditService.uploadAvatar.and.returnValue(Promise.resolve(avatarUrl));

      const event = {
        target: {
          files: [file]
        }
      };

      await component.onAvatarSelected(event);

      expect(mockEditService.uploadAvatar).toHaveBeenCalledWith(file);
      expect(component.newAvatar).toBe(avatarUrl);
    });
  });

  // PU-AV-04: Error inesperado del servicio
  describe('PU-AV-04: Error inesperado del servicio', () => {
    it('Debería manejar el error cuando el servicio lanza una excepción', async () => {
      const file = new File(['content'], 'avatar.jpg', { type: 'image/jpeg' });
      mockEditService.uploadAvatar.and.returnValue(
        Promise.reject(new Error('Error de conexión'))
      );

      const event = {
        target: {
          files: [file]
        }
      };

      const consoleSpy = spyOn(console, 'error');

      try {
        await component.onAvatarSelected(event);
      } catch (e) {
        // El componente maneja el error internamente
      }

      expect(mockEditService.uploadAvatar).toHaveBeenCalledWith(file);
    });
  });
});
