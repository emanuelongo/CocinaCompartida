// src/recipes/dto/create-recipe.dto.ts
import {
  IsString,
  IsArray,
  IsOptional,
  ArrayMinSize,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';

export class CreateRecipeDto {
  @IsString()
  name: string;

  @IsString()
  descripcion: string;

  @IsArray()
  @ArrayMinSize(1)
  ingredients: any[];

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  servings?: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  steps: string[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  images?: string[];

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  @IsIn(['facil', 'media', 'dificil'])
  dificultad?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  tiempoPreparacion?: number;
}
