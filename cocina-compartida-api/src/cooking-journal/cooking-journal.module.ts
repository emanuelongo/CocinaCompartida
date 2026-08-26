import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Recipe } from '../recipes/entities/recipe.entity';
import { UploadsModule } from '../uploads/uploads.module';
import { CookingJournalController } from './cooking-journal.controller';
import { CookingJournalService } from './cooking-journal.service';
import { CookingExperience } from './entities/cooking-experience.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CookingExperience, Recipe]),
    AuthModule,
    UploadsModule,
  ],
  controllers: [CookingJournalController],
  providers: [CookingJournalService],
  exports: [CookingJournalService],
})
export class CookingJournalModule {}