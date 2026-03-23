import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { Recipe } from './entities/recipe.entity';
import { Comment } from './entities/comment.entity';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

describe('RecipesService - Subir Recetas', () => {
  let service: RecipesService;
  let recipeRepository: Repository<Recipe>;
  let commentRepository: Repository<Comment>;

  // Mocks
  const mockRecipeRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  const mockCommentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
  };

  // Usuario mock (dueño de la receta)
  const mockOwnerUser = {
    id: 'owner-user-id-123',
    username: 'owneruser',
    email: 'owner@example.com',
    password: 'hashedpassword',
    avatar: 'avatars/owner.jpg',
    bio: 'Owner user',
    isActive: true,
    role: 'user',
  };

  // Usuario mock (no dueño)
  const mockOtherUser = {
    id: 'other-user-id-456',
    username: 'otheruser',
    email: 'other@example.com',
    password: 'hashedpassword',
    avatar: 'avatars/other.jpg',
    bio: 'Other user',
    isActive: true,
    role: 'user',
  };

  // Receta mock
  const mockRecipe = {
    id: 'recipe-id-789',
    name: 'Pasta Carbonara',
    descripcion: 'Deliciosa pasta italiana',
    ingredients: ['pasta', 'huevos', 'bacon', 'queso'],
    steps: ['Cocinar pasta', 'Mezclar ingredientes', 'Combinar'],
    images: ['pasta-carbonara.jpg'],
    user: mockOwnerUser,
    likes: 0,
    likedBy: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // DTO válido para creación
  const validCreateDto: CreateRecipeDto = {
    name: 'Pasta Carbonara',
    descripcion: 'Deliciosa pasta italiana',
    ingredients: ['pasta', 'huevos', 'bacon', 'queso'],
    steps: ['Cocinar pasta', 'Mezclar ingredientes', 'Combinar'],
    images: ['pasta-carbonara.jpg'],
  };

  // DTO válido para actualización
  const validUpdateDto: UpdateRecipeDto = {
    name: 'Pasta Carbonara Actualizada',
    descripcion: 'Nueva descripción',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipesService,
        {
          provide: getRepositoryToken(Recipe),
          useValue: mockRecipeRepository,
        },
        {
          provide: getRepositoryToken(Comment),
          useValue: mockCommentRepository,
        },
      ],
    }).compile();

    service = module.get<RecipesService>(RecipesService);
    recipeRepository = module.get<Repository<Recipe>>(getRepositoryToken(Recipe));
    commentRepository = module.get<Repository<Comment>>(getRepositoryToken(Comment));

    // Limpiar mocks antes de cada test
    jest.clearAllMocks();
  });

  // ==================== B1: CREACIÓN EXITOSA ====================
  describe('B1 - Creación Exitosa', () => {
    it('Debería retornar 201; receta creada con likes:0', async () => {
      // Arrange
      const createdRecipe = {
        ...mockRecipe,
        likes: 0,
        likedBy: [],
        user: mockOwnerUser,
      };

      mockRecipeRepository.create.mockReturnValue(createdRecipe);
      mockRecipeRepository.save.mockResolvedValue(createdRecipe);

      // Act
      const result = await service.create(validCreateDto, mockOwnerUser as any);

      // Assert
      expect(result).toBeDefined();
      expect(result.likes).toBe(0);
      expect(mockRecipeRepository.create).toHaveBeenCalledWith({
        ...validCreateDto,
        user: mockOwnerUser,
        likes: 0,
        likedBy: [],
      });
      expect(mockRecipeRepository.save).toHaveBeenCalled();
    });

    it('Debería crear receta sin imágenes y con likes en 0', async () => {
      // Arrange
      const createDtoWithoutImages: CreateRecipeDto = {
        name: 'Receta Sin Imagenes',
        descripcion: 'Descripción simple',
        ingredients: ['ingrediente1', 'ingrediente2'],
        steps: ['paso1', 'paso2'],
      };

      const createdRecipe = {
        id: 'new-recipe-id',
        ...createDtoWithoutImages,
        images: [],
        user: mockOwnerUser,
        likes: 0,
        likedBy: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRecipeRepository.create.mockReturnValue(createdRecipe);
      mockRecipeRepository.save.mockResolvedValue(createdRecipe);

      // Act
      const result = await service.create(createDtoWithoutImages, mockOwnerUser as any);

      // Assert
      expect(result.likes).toBe(0);
      expect(result.likedBy).toEqual([]);
      expect(mockRecipeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          likes: 0,
          likedBy: [],
        }),
      );
    });
  });

  // ==================== B2: EDICIÓN EXITOSA ====================
  describe('B2 - Edición Exitosa', () => {
    it('Debería retornar 200; receta actualizada mediante Object.assign', async () => {
      // Arrange
      const updatedRecipe = {
        ...mockRecipe,
        ...validUpdateDto,
      };

      mockRecipeRepository.findOne.mockResolvedValue(mockRecipe);
      mockRecipeRepository.save.mockResolvedValue(updatedRecipe);

      // Act
      const result = await service.update(
        mockRecipe.id,
        validUpdateDto,
        mockOwnerUser as any,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe('Pasta Carbonara Actualizada');
      expect(result.descripcion).toBe('Nueva descripción');
      expect(mockRecipeRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockRecipe.id },
        relations: ['user', 'comments', 'comments.user'],
      });
      expect(mockRecipeRepository.save).toHaveBeenCalled();
    });

    it('Debería usar Object.assign para actualizar la receta', async () => {
      // Arrange
      const recipeBeforeUpdate = { ...mockRecipe };
      
      mockRecipeRepository.findOne.mockResolvedValue(recipeBeforeUpdate);
      mockRecipeRepository.save.mockImplementation((recipe) => Promise.resolve(recipe));

      // Act
      await service.update(
        mockRecipe.id,
        validUpdateDto,
        mockOwnerUser as any,
      );

      // Assert - Verificar que se用了 Object.assign
      // El servicio debe haber llamado save con los datos actualizados
      expect(mockRecipeRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Pasta Carbonara Actualizada',
          descripcion: 'Nueva descripción',
        }),
      );
    });
  });

  // ==================== B3: RECETA NO ENCONTRADA ====================
  describe('B3 - Receta No Encontrada', () => {
    it('Debería lanzar NotFoundException (Error 404) cuando el ID no existe', async () => {
      // Arrange
      const nonExistentId = 'non-existent-recipe-id';
      mockRecipeRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.findOne(nonExistentId),
      ).rejects.toThrow(NotFoundException);
      
      await expect(
        service.findOne(nonExistentId),
      ).rejects.toThrow(`Recipe with ID "${nonExistentId}" not found`);
    });

    it('Debería lanzar NotFoundException en update cuando la receta no existe', async () => {
      // Arrange
      const nonExistentId = 'non-existent-recipe-id';
      mockRecipeRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update(nonExistentId, validUpdateDto, mockOwnerUser as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('Debería lanzar NotFoundException en remove cuando la receta no existe', async () => {
      // Arrange
      const nonExistentId = 'non-existent-recipe-id';
      mockRecipeRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.remove(nonExistentId, mockOwnerUser as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== B4: USUARIO NO AUTORIZADO ====================
  describe('B4 - Usuario No Autorizado', () => {
    it('Debería lanzar ForbiddenException (Error 403) cuando el usuario no es el dueño', async () => {
      // Arrange
      mockRecipeRepository.findOne.mockResolvedValue(mockRecipe);

      // Act & Assert
      await expect(
        service.update(mockRecipe.id, validUpdateDto, mockOtherUser as any),
      ).rejects.toThrow(ForbiddenException);
      
      await expect(
        service.update(mockRecipe.id, validUpdateDto, mockOtherUser as any),
      ).rejects.toThrow('You can only update your own recipes');
    });

    it('Debería lanzar ForbiddenException en remove cuando el usuario no es el dueño', async () => {
      // Arrange
      mockRecipeRepository.findOne.mockResolvedValue(mockRecipe);

      // Act & Assert
      await expect(
        service.remove(mockRecipe.id, mockOtherUser as any),
      ).rejects.toThrow(ForbiddenException);
      
      await expect(
        service.remove(mockRecipe.id, mockOtherUser as any),
      ).rejects.toThrow('You can only delete your own recipes');
    });

    it('No debería llamar a save cuando el usuario no está autorizado', async () => {
      // Arrange
      mockRecipeRepository.findOne.mockResolvedValue(mockRecipe);

      // Act
      try {
        await service.update(mockRecipe.id, validUpdateDto, mockOtherUser as any);
      } catch (error) {
        // Se espera que lanze ForbiddenException
      }

      // Assert - save no debe ser llamado porque debe verificar ownership primero
      expect(mockRecipeRepository.save).not.toHaveBeenCalled();
    });
  });

  // ==================== TESTS ADICIONALES ====================
  describe('Casos adicionales', () => {
    it('findAll debería retornar todas las recetas', async () => {
      // Arrange
      const recipes = [mockRecipe];
      mockRecipeRepository.find.mockResolvedValue(recipes);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(recipes);
      expect(mockRecipeRepository.find).toHaveBeenCalledWith({
        relations: ['user', 'comments', 'comments.user'],
        order: { createdAt: 'DESC' },
      });
    });

    it('findTopLiked debería retornar recetas ordenadas por likes', async () => {
      // Arrange
      const recipes = [mockRecipe];
      mockRecipeRepository.find.mockResolvedValue(recipes);

      // Act
      const result = await service.findTopLiked(5);

      // Assert
      expect(result).toEqual(recipes);
      expect(mockRecipeRepository.find).toHaveBeenCalledWith({
        relations: ['user', 'comments', 'comments.user'],
        order: { likes: 'DESC', createdAt: 'DESC' },
        take: 5,
      });
    });

    it('toggleLike debería incrementar likes cuando el usuario no ha dado like', async () => {
      // Arrange
      const recipeWithNoLike = {
        ...mockRecipe,
        likedBy: [],
        likes: 0,
      };
      
      mockRecipeRepository.findOne.mockResolvedValue(recipeWithNoLike);
      mockRecipeRepository.save.mockImplementation((recipe) => Promise.resolve(recipe));

      // Act
      const result = await service.toggleLike(mockRecipe.id, mockOtherUser as any);

      // Assert
      expect(result.likes).toBe(1);
      expect(result.likedBy).toContain(mockOtherUser.id);
    });

    it('toggleLike debería decrementar likes cuando el usuario ya dio like', async () => {
      // Arrange
      const recipeWithLike = {
        ...mockRecipe,
        likedBy: [mockOtherUser.id],
        likes: 1,
      };
      
      mockRecipeRepository.findOne.mockResolvedValue(recipeWithLike);
      mockRecipeRepository.save.mockImplementation((recipe) => Promise.resolve(recipe));

      // Act
      const result = await service.toggleLike(mockRecipe.id, mockOtherUser as any);

      // Assert
      expect(result.likes).toBe(0);
      expect(result.likedBy).not.toContain(mockOtherUser.id);
    });
  });
});

