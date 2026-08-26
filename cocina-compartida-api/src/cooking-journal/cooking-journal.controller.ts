import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { AuthGuard } from '../security/auth.guard';
import { imageUploadOptions } from '../uploads/image-upload.config';
import { CookingJournalService } from './cooking-journal.service';
import { CreateCookingExperienceDto } from './dto/create-cooking-experience.dto';

type AuthenticatedRequest = Request & {
  user: { id: string };
};

@Controller()
@UseGuards(AuthGuard)
export class CookingJournalController {
  constructor(private readonly cookingJournalService: CookingJournalService) {}

  @Post('recipes/:recipeId/experiences')
  @UseInterceptors(FileInterceptor('photo', imageUploadOptions))
  create(
    @Param('recipeId') recipeId: string,
    @Body() dto: CreateCookingExperienceDto,
    @UploadedFile() photo: Express.Multer.File | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.cookingJournalService.create(recipeId, req.user.id, dto, photo);
  }

  @Get('recipes/:recipeId/experiences/me')
  findMineByRecipe(
    @Param('recipeId') recipeId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.cookingJournalService.findMineByRecipe(recipeId, req.user.id);
  }

  @Get('cooking-experiences/me')
  findMine(@Req() req: AuthenticatedRequest) {
    return this.cookingJournalService.findMine(req.user.id);
  }

  @Delete('cooking-experiences/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.cookingJournalService.remove(id, req.user.id);
  }
}