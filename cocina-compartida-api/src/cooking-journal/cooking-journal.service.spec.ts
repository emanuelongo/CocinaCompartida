import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { validate } from 'class-validator';
import { Recipe } from '../recipes/entities/recipe.entity';
import { SupabaseStorageService } from '../uploads/supabase-storage.service';
import { CookingJournalService } from './cooking-journal.service';
import { CreateCookingExperienceDto } from './dto/create-cooking-experience.dto';
import { CookingExperience } from './entities/cooking-experience.entity';

describe('CookingJournalService', () => {
  let service: CookingJournalService;
  let experienceRepository: Record<string, jest.Mock>;
  let recipeRepository: Record<string, jest.Mock>;
  let storageService: Record<string, jest.Mock>;

  beforeEach(async () => {
    experienceRepository = {
      create: jest.fn(
        (value: Partial<CookingExperience>) => value as CookingExperience,
      ),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    recipeRepository = {
      findOneBy: jest.fn(),
      existsBy: jest.fn(),
    };
    storageService = {
      uploadCookingExperienceImage: jest.fn(),
      deleteFile: jest.fn(),
    };

    const testingModule = await Test.createTestingModule({
      providers: [
        CookingJournalService,
        {
          provide: getRepositoryToken(CookingExperience),
          useValue: experienceRepository,
        },
        { provide: getRepositoryToken(Recipe), useValue: recipeRepository },
        { provide: SupabaseStorageService, useValue: storageService },
      ],
    }).compile();

    service = testingModule.get(CookingJournalService);
  });

  it('guarda una experiencia con fotografía y datos normalizados', async () => {
    const recipe = { id: 'recipe-1', name: 'Tacos' } as Recipe;
    const photo = { originalname: 'result.jpg' } as Express.Multer.File;
    const saved = { id: 'experience-1' } as CookingExperience;
    const complete = { ...saved, recipe, rating: 5 } as CookingExperience;
    recipeRepository.findOneBy.mockResolvedValue(recipe);
    storageService.uploadCookingExperienceImage.mockResolvedValue(
      '/uploads/experiences/result.jpg',
    );
    experienceRepository.save.mockResolvedValue(saved);
    experienceRepository.findOne.mockResolvedValue(complete);

    const result = await service.create(
      recipe.id,
      'user-1',
      {
        rating: '5',
        preparationNotes: '  Quedó dorado  ',
        ingredientChanges: 'Menos sal',
        recommendations: 'Hornear cinco minutos menos',
      },
      photo,
    );

    expect(storageService.uploadCookingExperienceImage).toHaveBeenCalledWith(
      photo,
      'user-1',
      recipe.id,
    );
    expect(experienceRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        rating: 5,
        preparationNotes: 'Quedó dorado',
        photoUrl: '/uploads/experiences/result.jpg',
        user: { id: 'user-1' },
      }),
    );
    expect(result).toBe(complete);
  });

  it('rechaza la creación cuando la receta no existe', async () => {
    recipeRepository.findOneBy.mockResolvedValue(null);

    await expect(
      service.create('missing', 'user-1', { rating: '4' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('consulta únicamente el historial del usuario autenticado', async () => {
    experienceRepository.find.mockResolvedValue([]);

    await service.findMine('user-1');

    expect(experienceRepository.find).toHaveBeenCalledWith({
      where: { user: { id: 'user-1' } },
      relations: ['recipe'],
      order: { createdAt: 'DESC' },
    });
  });

  it('elimina la fotografía junto con la experiencia', async () => {
    const experience = {
      id: 'experience-1',
      photoUrl: '/uploads/experiences/result.jpg',
    } as CookingExperience;
    experienceRepository.findOne.mockResolvedValue(experience);

    await service.remove(experience.id, 'user-1');

    expect(storageService.deleteFile).toHaveBeenCalledWith(experience.photoUrl);
    expect(experienceRepository.remove).toHaveBeenCalledWith(experience);
  });
});

describe('CreateCookingExperienceDto', () => {
  it('acepta calificaciones del 1 al 5', async () => {
    const dto = new CreateCookingExperienceDto();
    dto.rating = '5';
    expect(await validate(dto)).toHaveLength(0);
  });

  it('rechaza calificaciones fuera del rango', async () => {
    const dto = new CreateCookingExperienceDto();
    dto.rating = '0';
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'rating')).toBe(true);
  });
});