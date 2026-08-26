import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCookingExperienceDto {
  @IsIn(['1', '2', '3', '4', '5'], {
    message: 'La calificación debe estar entre 1 y 5',
  })
  rating: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  preparationNotes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  ingredientChanges?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  recommendations?: string;
}