import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { promises as fs } from 'node:fs';
import { dirname, extname, join, normalize, sep } from 'node:path';
import * as crypto from 'node:crypto';

@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private readonly supabase: SupabaseClient | null = null;
  private readonly avatarsBucket: string;
  private readonly recipesBucket: string;
  private readonly storageRoot = process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');

  constructor() {
    const url = process.env.SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_SERVICE_KEY?.trim();
    this.avatarsBucket = process.env.SUPABASE_AVATARS_BUCKET?.trim() || 'avatars';
    this.recipesBucket = process.env.SUPABASE_RECIPES_BUCKET?.trim() || 'recipes';

    if (url && key) {
      this.supabase = createClient(url, key);
      this.logger.log(
        `Supabase Storage inicializado. Buckets: [avatars: "${this.avatarsBucket}", recipes: "${this.recipesBucket}"]`,
      );
    } else {
      this.logger.warn(
        'SUPABASE_URL o SUPABASE_SERVICE_KEY no configurados. Se utilizará almacenamiento local en disco.',
      );
    }
  }

  async uploadRecipeImage(file: Express.Multer.File, recipeId: string): Promise<string> {
    const ext = extname(file.originalname);
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const safeRecipeId = this.safeSegment(recipeId || 'default');

    if (this.supabase) {
      const filePath = `${safeRecipeId}/${uniqueName}`;
      const { error } = await this.supabase.storage
        .from(this.recipesBucket)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        this.logger.error(`Error subiendo imagen de receta a Supabase: ${error.message}`);
        throw new Error(`Error al subir imagen: ${error.message}`);
      }

      const { data } = this.supabase.storage
        .from(this.recipesBucket)
        .getPublicUrl(filePath);

      return data.publicUrl;
    }

    // Almacenamiento local de respaldo (desarrollo o testing sin Supabase)
    const relativePath = `recipes/${safeRecipeId}/${uniqueName}`;
    await this.writeFile(relativePath, file.buffer);
    return this.getPublicUrl(relativePath);
  }

  async uploadAvatar(file: Express.Multer.File, username: string): Promise<string> {
    const ext = extname(file.originalname);
    const safeName = this.safeSegment(username || 'default');
    const fileName = `${safeName}-${Date.now()}${ext}`;

    if (this.supabase) {
      const { error } = await this.supabase.storage
        .from(this.avatarsBucket)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (error) {
        this.logger.error(`Error subiendo avatar a Supabase: ${error.message}`);
        throw new Error(`Error al subir avatar: ${error.message}`);
      }

      const { data } = this.supabase.storage
        .from(this.avatarsBucket)
        .getPublicUrl(fileName);

      return data.publicUrl;
    }

    // Almacenamiento local de respaldo
    const relativePath = `avatars/${fileName}`;
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

    if (this.supabase) {
      const filePath = `experiences/${safeUserId}/${safeRecipeId}/${uniqueName}`;
      const { error } = await this.supabase.storage
        .from(this.recipesBucket)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (error) {
        this.logger.error(`Error subiendo imagen de experiencia a Supabase: ${error.message}`);
        throw new Error(`Error al subir imagen: ${error.message}`);
      }

      const { data } = this.supabase.storage
        .from(this.recipesBucket)
        .getPublicUrl(filePath);

      return data.publicUrl;
    }

    // Almacenamiento local de respaldo
    const relativePath = `experiences/${safeUserId}/${safeRecipeId}/${uniqueName}`;
    await this.writeFile(relativePath, file.buffer);
    return this.getPublicUrl(relativePath);
  }

  async deleteFile(pathOrUrl: string): Promise<void> {
    if (!pathOrUrl) return;

    if (this.supabase && pathOrUrl.includes('/storage/v1/object/public/')) {
      const match = pathOrUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
      if (match) {
        const [, bucket, rawPath] = match;
        const filePath = decodeURIComponent(rawPath.split('?')[0]);
        const { error } = await this.supabase.storage.from(bucket).remove([filePath]);
        if (error) {
          this.logger.warn(`No se pudo eliminar de Supabase Storage (${bucket}/${filePath}): ${error.message}`);
        }
        return;
      }
    }

    // Fallback para archivos locales
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
