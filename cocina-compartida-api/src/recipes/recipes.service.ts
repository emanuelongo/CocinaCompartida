import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recipe } from './entities/recipe.entity';
import { Comment } from './entities/comment.entity';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { User } from 'src/user/entities/user.entity';
import {
  ScaledIngredientsResult,
  scaleIngredients,
} from './ingredient-scaling';

@Injectable()
export class RecipesService {
  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
  ) {}

  // Crear receta
  async create(createRecipeDto: CreateRecipeDto, user: User): Promise<Recipe> {
    const rawIngredients = createRecipeDto.ingredients ?? [];
    const formattedIngredients = rawIngredients.map((item) => {
      if (typeof item === 'object' && item !== null) {
        return JSON.stringify(item);
      }
      return String(item);
    });

    const recipe = this.recipeRepository.create({
      ...createRecipeDto,
      ingredients: formattedIngredients,
      user,
      likes: 0,
      likedBy: [],
    });

    return await this.recipeRepository.save(recipe);
  }

  // Listar todas
  async findAll(): Promise<Recipe[]> {
    return await this.recipeRepository.find({
      relations: ['user', 'comments', 'comments.user'],
      order: { createdAt: 'DESC' },
    });
  }

  // Filtrar por tag
  async findByTag(tag: string): Promise<Recipe[]> {
    const all = await this.recipeRepository.find({
      relations: ['user', 'comments', 'comments.user'],
    });
    return all.filter((r) => Array.isArray(r.tags) && r.tags.includes(tag));
  }

  // Listar top recipes por likes
  async findTopLiked(limit: number = 3): Promise<Recipe[]> {
    if (limit <= 0) {
      throw new BadRequestException('Limit must be greater than 0');
    }
    try {
      return await this.recipeRepository.find({
        relations: ['user', 'comments', 'comments.user'],
        order: { likes: 'DESC', createdAt: 'DESC' },
        take: limit,
      });
    } catch {
      throw new InternalServerErrorException('Error fetching top recipes');
    }
  }

  // Buscar una
  async findOne(id: string): Promise<Recipe> {
    const recipe = await this.recipeRepository.findOne({
      where: { id },
      relations: ['user', 'comments', 'comments.user'],
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with ID "${id}" not found`);
    }
    return recipe;
  }

  async scaleIngredients(
    id: string,
    selectedServings: number,
  ): Promise<ScaledIngredientsResult & { recipeId: string }> {
    if (
      !Number.isInteger(selectedServings) ||
      selectedServings < 1 ||
      selectedServings > 100
    ) {
      throw new BadRequestException('Las porciones deben estar entre 1 y 100');
    }

    const recipe = await this.findOne(id);
    const originalServings = recipe.servings || 2;
    return {
      recipeId: recipe.id,
      ...scaleIngredients(
        recipe.ingredients,
        originalServings,
        selectedServings,
      ),
    };
  }

  // Actualizar (solo dueño)
  async update(
    id: string,
    updateRecipeDto: UpdateRecipeDto,
    user: User,
  ): Promise<Recipe> {
    const recipe = await this.findOne(id);

    if (recipe.user.id !== user.id) {
      throw new ForbiddenException('You can only update your own recipes');
    }

    const payload = { ...updateRecipeDto };
    if (payload.ingredients) {
      payload.ingredients = payload.ingredients.map((item) => {
        if (typeof item === 'object' && item !== null) {
          return JSON.stringify(item);
        }
        return String(item);
      });
    }

    Object.assign(recipe, payload);
    return await this.recipeRepository.save(recipe);
  }

  // Eliminar (solo dueño)
  async remove(id: string, user: User): Promise<void> {
    const recipe = await this.findOne(id);

    if (recipe.user.id !== user.id) {
      throw new ForbiddenException('You can only delete your own recipes');
    }

    await this.recipeRepository.remove(recipe);
  }

  // TOGGLE LIKE
  async toggleLike(
    id: string,
    user: User,
  ): Promise<{ likes: number; likedBy: string[] }> {
    const recipe = await this.findOne(id);

    if (!Array.isArray(recipe.likedBy)) {
      recipe.likedBy = [];
    }

    const hasLiked = recipe.likedBy.includes(user.id);

    if (hasLiked) {
      recipe.likedBy = recipe.likedBy.filter((u) => u !== user.id);
    } else {
      recipe.likedBy.push(user.id);
    }

    recipe.likes = recipe.likedBy.length;

    await this.recipeRepository.save(recipe);
    return { likes: recipe.likes, likedBy: recipe.likedBy };
  }

  async createComment(
    recipeId: string,
    createCommentDto: CreateCommentDto,
    user: User,
  ): Promise<Comment> {
    const recipe = await this.findOne(recipeId);

    const comment = this.commentRepository.create({
      ...createCommentDto,
      user,
      recipe,
    });

    return await this.commentRepository.save(comment);
  }

  async findCommentsByRecipe(recipeId: string): Promise<Comment[]> {
    await this.findOne(recipeId);
    try {
      return await this.commentRepository.find({
        where: { recipe: { id: recipeId } },
        relations: ['user'],
        order: { createdAt: 'ASC' },
      });
    } catch {
      throw new InternalServerErrorException('Error fetching comments');
    }
  }

  async removeComment(commentId: string, user: User): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ['user'],
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID "${commentId}" not found`);
    }

    if (comment.user.id !== user.id) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    try {
      await this.commentRepository.softRemove(comment);
    } catch {
      throw new ConflictException('Error deleting comment');
    }
  }
}