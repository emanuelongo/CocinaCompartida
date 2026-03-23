import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SignUp } from './sign-up';
import { Auth } from '../../../shared/services/auth';
import { UploadService } from '../../../shared/services/upload';

describe('SignUp Component - Registro de Usuario', () => {
  let component: SignUp;
  let fixture: ComponentFixture<SignUp>;
  let mockAuthService: jasmine.SpyObj<Auth>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockUploadService: jasmine.SpyObj<UploadService>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('Auth', ['signup']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockUploadService = jasmine.createSpyObj('UploadService', ['uploadFile']);

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, CommonModule, SignUp],
      providers: [
        { provide: Auth, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: UploadService, useValue: mockUploadService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SignUp);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // PU-FR-01: Formulario inválido
  describe('PU-FR-01: Formulario inválido', () => {
    it('Debería mostrar alerta cuando los campos obligatorios están vacíos', async () => {
      const alertSpy = spyOn(component as any, 'showAlert');
      component.signUpForm.patchValue({
        username: '',
        email: '',
        password: '',
        rePassword: ''
      });

      await component.onSignUp();

      expect(alertSpy).toHaveBeenCalledWith(
        'Ops!',
        'Por favor complete todos los campos requeridos correctamente'
      );
      expect(component.isSubmitting).toBeFalse();
    });
  });

  // PU-FR-02: Contraseñas no coinciden
  describe('PU-FR-02: Contraseñas no coinciden', () => {
    it('Debería mostrar alerta cuando las contraseñas no coinciden', async () => {
      const alertSpy = spyOn(component as any, 'showAlert');
      component.signUpForm.patchValue({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        rePassword: 'password456'
      });

      await component.onSignUp();

      expect(alertSpy).toHaveBeenCalledWith('Ops!', 'Las contraseñas no coinciden');
      expect(mockAuthService.signup).not.toHaveBeenCalled();
    });
  });

  // PU-FR-03: Error del servicio
  describe('PU-FR-03: Error del servicio', () => {
    it('Debería mostrar alerta de error cuando el servicio lanza una excepción', async () => {
      const alertSpy = spyOn(component as any, 'showAlert');
      mockAuthService.signup.and.throwError('Error de conexión');

      component.signUpForm.patchValue({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        rePassword: 'password123'
      });

      await component.onSignUp();

      expect(alertSpy).toHaveBeenCalledWith(
        'Error',
        'Ocurrió un error inesperado. Por favor intente nuevamente.'
      );
      expect(component.isSubmitting).toBeFalse();
    });
  });

  // PU-FR-04: Registro fallido (res.success = false)
  describe('PU-FR-04: Registro fallido', () => {
    it('Debería mostrar alerta cuando res.success = false', async () => {
      const alertSpy = spyOn(component as any, 'showAlert');
      mockAuthService.signup.and.returnValue(
        Promise.resolve({ success: false, message: 'El usuario ya existe' })
      );

      component.signUpForm.patchValue({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        rePassword: 'password123'
      });

      await component.onSignUp();

      expect(alertSpy).toHaveBeenCalledWith(
        'Ops!',
        'El usuario ya existe'
      );
      expect(mockRouter.navigate).not.toHaveBeenCalled();
      expect(component.isSubmitting).toBeFalse();
    });
  });

  // PU-FR-05: Registro exitoso (res.success = true)
  describe('PU-FR-05: Registro exitoso', () => {
    it('Debería mostrar toast de éxito y navegar a /home cuando res.success = true', async () => {
      const toastSpy = spyOn(component as any, 'showToast');
      mockAuthService.signup.and.returnValue(
        Promise.resolve({ success: true, message: 'Registro exitoso' })
      );

      component.signUpForm.patchValue({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        rePassword: 'password123'
      });

      await component.onSignUp();

      expect(toastSpy).toHaveBeenCalledWith('success', '¡Registro exitoso!');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
      expect(component.isSubmitting).toBeFalse();
    });
  });
});
