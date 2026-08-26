import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { dirname, extname, join, normalize, sep } from 'node:path';
import * as crypto from 'node:crypto';

@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private readonly storageRoot = process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');

  async uploadRecipeImage(file: Express.Multer.File, recipeId: string): Promise<string> {
    const ext = extname(file.originalname);
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const safeRecipeId = this.safeSegment(recipeId || 'default');
    const relativePath = `recipes/${safeRecipeId}/${uniqueName}`;

    await this.writeFile(relativePath, file.buffer);
    return this.getPublicUrl(relativePath);
  }

  async uploadAvatar(file: Express.Multer.File, username: string): Promise<string> {
    const ext = extname(file.originalname);
    const safeName = this.safeSegment(username || 'default');
    const relativePath = `avatars/${safeName}-${Date.now()}${ext}`;

    await this.writeFile(relativePath, file.buffer);
    return this.getPublicUrl(relativePath);
  }

  async uploadCookingExperienceImage(
    file: Express.Multer.File,
    userId: string,
    recipeId: string,
  ): Promise<string> {
    const ext = extname(file.originalname);
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const safeUserId = this.safeSegment(userId);
    const safeRecipeId = this.safeSegment(recipeId);
    const relativePath = `experiences/${safeUserId}/${safeRecipeId}/${uniqueName}`;

    await this.writeFile(relativePath, file.buffer);
    return this.getPublicUrl(relativePath);
  }

  async deleteFile(pathOrUrl: string): Promise<void> {
    try {
      const target = this.resolveSafePath(this.toRelativePath(pathOrUrl));
      await fs.unlink(target);
    } catch (error: any) {
      if (error?.code !== 'ENOENT') {
        this.logger.warn(`No se pudo eliminar ${pathOrUrl}: ${error.message}`);
      }
    }
  }

  private async writeFile(relativePath: string, buffer: Buffer): Promise<void> {
    const target = this.resolveSafePath(relativePath);

    try {
      await fs.mkdir(dirname(target), { recursive: true });
      await fs.writeFile(target, buffer);
    } catch (error: any) {
      this.logger.error(`Error guardando archivo local: ${error.message}`);
      throw new Error(`Error al guardar archivo: ${error.message}`);
    }
  }

  private getPublicUrl(relativePath: string): string {
    return `/uploads/${relativePath.replace(/\\/g, '/')}`;
  }

  private safeSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private toRelativePath(pathOrUrl: string): string {
    let path = pathOrUrl;

    try {
      path = new URL(pathOrUrl).pathname;
    } catch {
      // The value can already be a local relative path.
    }

    path = path.replace(/\\/g, '/');
    path = path.replace(/^\/?uploads\//, '');
    return path.replace(/^\/+/, '');
  }

  private resolveSafePath(relativePath: string): string {
    const root = normalize(this.storageRoot);
    const target = normalize(join(root, relativePath));

    if (target !== root && !target.startsWith(root + sep)) {
      throw new Error('Ruta de archivo no permitida');
    }

    return target;
  }
}