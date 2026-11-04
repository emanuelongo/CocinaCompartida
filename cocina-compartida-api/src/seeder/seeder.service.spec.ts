import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { SeederService } from './seeder.service';
import { Recipe } from '../recipes/entities/recipe.entity';
import { User } from '../user/entities/user.entity';

jest.mock('bcrypt');

describe('SeederService', () => {
  let service: SeederService;
  
  // Mocks for repositories
  const mockRecipeRepository = {
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeederService,
        {
          provide: getRepositoryToken(Recipe),
          useValue: mockRecipeRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<SeederService>(SeederService);
    
    // Silence logger during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    
    // Clear mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should call seed method', async () => {
      const seedSpy = jest.spyOn(service as any, 'seed').mockImplementation();
      await service.onModuleInit();
      expect(seedSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('seed', () => {
    it('should skip seeding if there are 20 or more recipes', async () => {
      mockRecipeRepository.count.mockResolvedValue(20);
      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await (service as any).seed();

      expect(mockRecipeRepository.count).toHaveBeenCalledTimes(1);
      expect(loggerSpy).toHaveBeenCalledWith('Ya hay suficientes recetas (20) en base de datos, saltando el seeder...');
      expect(mockUserRepository.findOne).not.toHaveBeenCalled();
    });

    it('should create ChefMaestro user and seed recipes if recipes count < 20', async () => {
      mockRecipeRepository.count.mockResolvedValue(0);
      mockUserRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUserRepository.create.mockReturnValue({ id: 1, username: 'ChefMaestro' });
      mockUserRepository.save.mockResolvedValue({ id: 1, username: 'ChefMaestro' });
      mockRecipeRepository.create.mockReturnValue([{ id: 1, name: 'Tacos' }]);
      mockRecipeRepository.save.mockResolvedValue([{ id: 1, name: 'Tacos' }]);

      const loggerSpy = jest.spyOn(service['logger'], 'log');

      await (service as any).seed();

      expect(mockRecipeRepository.count).toHaveBeenCalledTimes(1);
      
      // Checking user creation
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { username: 'ChefMaestro' } });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith('Usuario ChefMaestro creado.');

      // Checking recipes seeding
      expect(mockRecipeRepository.create).toHaveBeenCalled();
      expect(mockRecipeRepository.save).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith('Las 20 recetas han sido precargadas exitosamente.');
    });

    it('should not create ChefMaestro if user already exists', async () => {
      mockRecipeRepository.count.mockResolvedValue(0);
      mockUserRepository.findOne.mockResolvedValue({ id: 1, username: 'ChefMaestro' });
      mockRecipeRepository.create.mockReturnValue([{ id: 1, name: 'Tacos' }]);
      mockRecipeRepository.save.mockResolvedValue([{ id: 1, name: 'Tacos' }]);

      await (service as any).seed();

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { username: 'ChefMaestro' } });
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();

      // Recipes are still seeded
      expect(mockRecipeRepository.create).toHaveBeenCalled();
      expect(mockRecipeRepository.save).toHaveBeenCalled();
    });
  });
});
