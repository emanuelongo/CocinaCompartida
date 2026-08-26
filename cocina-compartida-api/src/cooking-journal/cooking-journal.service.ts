import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recipe } from '../recipes/entities/recipe.entity';
import { User } from '../user/entities/user.entity';
import { SupabaseStorageService } from '../uploads/supabase-storage.service';
import { CreateCookingExperienceDto } from './dto/create-cooking-experience.dto';
import { CookingExperience } from './entities/cooking-experience.entity';

@Injectable()
export class CookingJournalService {
  constructor(
    @InjectRepository(CookingExperience)
    private readonly experienceRepository: Repository<CookingExperience>,
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
    private readonly storageService: SupabaseStorageService,
  ) {}

  async create(
    recipeId: string,
    userId: string,
    dto: CreateCookingExperienceDto,
    photo?: Express.Multer.File,
  ): Promise<CookingExperience> {
    const recipe = await this.recipeRepository.findOneBy({ id: recipeId });
    if (!recipe) {
      throw new NotFoundException('Receta no encontrada');
    }

    let photoUrl: string | undefined;
    if (photo) {
      photoUrl = await this.storageService.uploadCookingExperienceImage(
        photo,
        userId,
        recipeId,
      );
    }

    try {
      const experience = this.experienceRepository.create({
        rating: Number(dto.rating),
        preparationNotes: dto.preparationNotes?.trim() ?? '',
        ingredientChanges: dto.ingredientChanges?.trim() ?? '',
        recommendations: dto.recommendations?.trim() ?? '',
        photoUrl,
        recipe,
        user: { id: userId } as User,
      });

      const saved = await this.experienceRepository.save(experience);
      return this.findOneForUser(saved.id, userId);
    } catch (error) {
      if (photoUrl) {
        await this.storageService.deleteFile(photoUrl);
      }
      throw error;
    }
  }

  findMine(userId: string): Promise<CookingExperience[]> {
    return this.experienceRepository.find({
      where: { user: { id: userId } },
      relations: ['recipe'],
      order: { createdAt: 'DESC' },
    });
  }

  async findMineByRecipe(
    recipeId: string,
    userId: string,
  ): Promise<CookingExperience[]> {
    const recipeExists = await this.recipeRepository.existsBy({ id: recipeId });
    if (!recipeExists) {
      throw new NotFoundException('Receta no encontrada');
    }

    return this.experienceRepository.find({
      where: { recipe: { id: recipeId }, user: { id: userId } },
      relations: ['recipe'],
      order: { createdAt: 'DESC' },
    });
  }

  async remove(id: string, userId: string): Promise<void> {
    const experience = await this.findOneForUser(id, userId);
    const photoUrl = experience.photoUrl;
    await this.experienceRepository.remove(experience);
    if (photoUrl) {
      await this.storageService.deleteFile(photoUrl);
    }
  }

  private async findOneForUser(
    id: string,
    userId: string,
  ): Promise<CookingExperience> {
    const experience = await this.experienceRepository.findOne({
      where: { id, user: { id: userId } },
      relations: ['recipe'],
    });

    if (!experience) {
      throw new NotFoundException('Experiencia culinaria no encontrada');
    }
    return experience;
  }
}