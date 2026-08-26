import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export const imageUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: (
    _req: unknown,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (IMAGE_MIME_TYPES.includes(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(
      new BadRequestException(
        'Tipo de archivo no permitido. Use JPEG, PNG, WebP o GIF',
      ),
      false,
    );
  },
};