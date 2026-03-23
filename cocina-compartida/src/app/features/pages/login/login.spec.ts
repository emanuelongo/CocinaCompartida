import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Login } from './login';
import { Auth } from '../../../shared/services/auth';
import Swal from 'sweetalert2';

describe('Login Component - Componente Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let mockAuthService: jasmine.SpyObj<Auth>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('Auth', ['login', 'logout']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, CommonModule, Login],
      providers: [
        { provide: Auth, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // F1: Bloqueo por Doble Clic
  describe('F1 - Bloqueo por Doble Clic', () => {
    it('Debería no hacer nada (return temprano) cuando isLoggingIn es true, evitando peticiones duplicadas', async () => {
      component.isLoggingIn = true;
      const fireSpy = spyOn(Swal, 'fire');

      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123'
      });

      await component.onLogin();

      expect(fireSpy).toHaveBeenCalled();
      expect(mockAuthService.login).not.toHaveBeenCalled();
      expect(component.isLoggingIn).toBeTrue();
    });
  });

  // F2: Formulario Inválido
  describe('F2 - Formulario Inválido', () => {
    it('Debería ejecutar markAllAsTouched() y mostrar Swal de error cuando campos están vacíos', async () => {
      const fireSpy = spyOn(Swal, 'fire');
      const markAllAsTouchedSpy = spyOn(component.loginForm, 'markAllAsTouched');

      component.loginForm.patchValue({
        email: '',
        password: ''
      });

      await component.onLogin();

      expect(markAllAsTouchedSpy).toHaveBeenCalled();

      expect(fireSpy).toHaveBeenCalledWith(
        jasmine.objectContaining({
          title: 'Ops!',
          text: 'Por favor complete todos los campos correctamente',
          icon: 'error'
        })
      );

      expect(mockAuthService.login).not.toHaveBeenCalled();

      it('Debería ejecutar markAllAsTouched() y mostrar Swal de error cuando email tiene formato inválido', async () => {
        const fireSpy = spyOn(Swal, 'fire');

        component.loginForm.patchValue({
          email: 'invalid-email',
          password: 'password123'
        });

        await component.onLogin();

        expect(fireSpy).toHaveBeenCalledWith(
          jasmine.objectContaining({
            title: 'Ops!',
            text: 'Por favor complete todos los campos correctamente',
            icon: 'error'
          })
        );
        expect(mockAuthService.login).not.toHaveBeenCalled();
      });
    });

    // F3: Navegación Exitosa
    describe('F3 - Navegación Exitosa', () => {
      it('Debería redireccionar a /home e isLoggingIn vuelve a false cuando success: true', async () => {
        const loginResponse = { success: true, token: 'jwt-token' };
        mockAuthService.login.and.returnValue(Promise.resolve(loginResponse));

        component.loginForm.patchValue({
          email: 'test@example.com',
          password: 'password123'
        });

        await component.onLogin();

        expect(mockAuthService.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        });
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/home'], { replaceUrl: true });
        expect(component.isLoggingIn).toBeFalse();
      });
    });

    // F4: Error de Credenciales
    describe('F4 - Error de Credenciales', () => {
      it('Debería mostrar Swal con el mensaje de error del servidor cuando success: false', async () => {
        const loginResponse = { success: false, message: 'Correo o contraseña incorrectos' };
        mockAuthService.login.and.returnValue(Promise.resolve(loginResponse));
        const fireSpy = spyOn(Swal, 'fire');

        component.loginForm.patchValue({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

        await component.onLogin();

        expect(mockAuthService.login).toHaveBeenCalled();
        expect(fireSpy).toHaveBeenCalledWith(
          jasmine.objectContaining({
            title: 'Ops!',
            text: 'Correo o contraseña incorrectos',
            icon: 'error'
          })
        );
        expect(mockRouter.navigate).not.toHaveBeenCalled();
        expect(component.isLoggingIn).toBeFalse();
      });

      it('Debería mostrar mensaje genérico cuando success: false pero no hay mensaje', async () => {
        const loginResponse = { success: false };
        mockAuthService.login.and.returnValue(Promise.resolve(loginResponse));
        const fireSpy = spyOn(Swal, 'fire');

        component.loginForm.patchValue({
          email: 'test@example.com',
          password: 'password123'
        });

        await component.onLogin();

        expect(fireSpy).toHaveBeenCalledWith(
          jasmine.objectContaining({
            title: 'Ops!',
            text: 'Error al iniciar sesión',
            icon: 'error'
          })
        );
        expect(component.isLoggingIn).toBeFalse();
      });
    });

    // F5: Error Inesperado (Crash)
    describe('F5 - Error Inesperado (Crash)', () => {
      it('Debería disparar el catch y mostrar Swal de error cuando el servicio falla (ej. 500 o Timeout)', async () => {
        mockAuthService.login.and.returnValue(
          Promise.reject(new Error('Error de conexión'))
        );
        const fireSpy = spyOn(Swal, 'fire');
        const consoleSpy = spyOn(console, 'error');

        component.loginForm.patchValue({
          email: 'test@example.com',
          password: 'password123'
        });

        await component.onLogin();

        expect(consoleSpy).toHaveBeenCalledWith('Error en login:', jasmine.any(Error));
        expect(fireSpy).toHaveBeenCalledWith(
          jasmine.objectContaining({
            title: 'Error',
            text: 'Ocurrió un error inesperado',
            icon: 'error'
          })
        );
        expect(mockRouter.navigate).not.toHaveBeenCalled();
        expect(component.isLoggingIn).toBeFalse();
      });

      it('Debería manejar Timeout del servicio correctamente', async () => {
        mockAuthService.login.and.returnValue(
          Promise.reject(new Error('Timeout'))
        );
        const fireSpy = spyOn(Swal, 'fire');

        component.loginForm.patchValue({
          email: 'test@example.com',
          password: 'password123'
        });

        await component.onLogin();

        expect(fireSpy).toHaveBeenCalledWith(
          jasmine.objectContaining({
            title: 'Error',
            text: 'Ocurrió un error inesperado',
            icon: 'error'
          })
        );
        expect(component.isLoggingIn).toBeFalse();
      });
    });
  });
});
