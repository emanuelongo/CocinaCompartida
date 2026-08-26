import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateAccessibilityPreferencesDto {
  @IsBoolean()
  @IsOptional()
  readingAssistantEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  autoReadEnabled?: boolean;

  @IsNumber()
  @Min(0.5)
  @Max(2)
  @IsOptional()
  speechRate?: number;

  @IsString()
  @MaxLength(120)
  @IsOptional()
  preferredVoice?: string | null;
}