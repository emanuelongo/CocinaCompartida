import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Query,
  Param,
  BadRequestException,
  Delete,
  Body,
  UseGuards,
  InternalServerErrorException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from 'src/security/auth.guard';
import { SupabaseStorageService } from './supabase-storage.service';
import { imageUploadOptions } from './image-upload.config';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly storageService: SupabaseStorageService) {}

  // ─── Avatar ──────────────────────────────────────────────────────────────

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      ...imageUploadOptions,
    }),
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Query('username') username: string,
  ) {
    if (!file) throw new BadRequestException('Archivo no provisto');

    try {
      const url = await this.storageService.uploadAvatar(file, username || 'default');
      return { url };
    } catch (e: any) {
      throw new InternalServerErrorException(e.message);
    }
  }

  // ─── Recipe images ────────────────────────────────────────────────────────

  @Post('recipes/:recipeId')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      ...imageUploadOptions,
    }),
  )
  async uploadRecipeImages(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Param('recipeId') recipeId: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se han subido archivos');
    }

    try {
      const urls = await Promise.all(
        files.map((file) => this.storageService.uploadRecipeImage(file, recipeId)),
      );
      return { urls };
    } catch (e: any) {
      throw new InternalServerErrorException(e.message);
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  @Delete()
  @UseGuards(AuthGuard)
  async deletePhoto(@Body('path') filePath: string) {
    if (!filePath) throw new BadRequestException('Path no provisto');

    try {
      await this.storageService.deleteFile(filePath);
      return { message: 'Archivo eliminado' };
    } catch (e: any) {
      throw new InternalServerErrorException('Error al eliminar archivo');
    }
  }
}