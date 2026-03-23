import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService - Login', () => {
  let service: AuthService;
  let userService: UserService;
  let jwtService: JwtService;

  const mockUser = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    username: 'testuser',
    email: 'test@example.com',
    password: '$2b$10$abcdefghijklmnopqrstuvwxyz', // bcrypt hash simulado
    avatar: 'avatars/test.jpg',
    bio: 'Test user',
    isActive: true,
  };

  const mockJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIn0.signature';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            findByEmail: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
  });

  // B1: Login Exitoso
  describe('B1 - Login Exitoso', () => {
    it('Debería retornar status 200 OK + JWT Token cuando email y password son válidos y existen', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      // Mock: usuario existe y password coincide
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(mockUser as any);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(true));
      jest.spyOn(jwtService, 'sign').mockReturnValue(mockJwtToken);

      const result = await service.login(loginDto);

      expect(result.success).toBe(true);
      expect(result.token).toBe(mockJwtToken);
      expect(userService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(jwtService.sign).toHaveBeenCalledWith({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        username: mockUser.username,
        url: mockUser.avatar,
      });
    });
  });

  // B2: DTO Inválido
  describe('B2 - DTO Inválido', () => {
    it('Debería retornar Error 404 cuando el email tiene formato incorrecto', async () => {
      const loginDto = {
        email: 'invalid-email-format',
        password: 'password123',
      };

      // Mock: usuario no encontrado (formato inválido)
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(NotFoundException);
      await expect(service.login(loginDto)).rejects.toThrow('Correo o contraseña incorrectos');
    });

    it('Debería retornar Error 404 cuando los campos están vacíos', async () => {
      const loginDto = {
        email: '',
        password: '',
      };

      // Mock: usuario no encontrado
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(NotFoundException);
    });
  });

  // B3: Usuario Inexistente
  describe('B3 - Usuario Inexistente', () => {
    it('Debería retornar Error 404 cuando el email no existe en la base de datos', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      // Mock: usuario no encontrado
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(NotFoundException);
      await expect(service.login(loginDto)).rejects.toThrow('Correo o contraseña incorrectos');
      expect(userService.findByEmail).toHaveBeenCalledWith('nonexistent@example.com');
    });
  });

  // B4: Password Incorrecto
  describe('B4 - Password Incorrecto', () => {
    it('Debería retornar Error 404 cuando el email es válido pero el password no coincide en bcrypt', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // Mock: usuario encontrado pero password no coincide
      jest.spyOn(userService, 'findByEmail').mockResolvedValue(mockUser as any);
      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      await expect(service.login(loginDto)).rejects.toThrow(NotFoundException);
      await expect(service.login(loginDto)).rejects.toThrow('Correo o contraseña incorrectos');
      expect(userService.findByEmail).toHaveBeenCalledWith('test@example.com');
    });
  });
});
