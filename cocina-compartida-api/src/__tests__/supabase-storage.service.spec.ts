import { Logger } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { SupabaseStorageService } from '../uploads/supabase-storage.service';

const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();
const mockRemove = jest.fn();
const mockStorageFrom = jest.fn().mockReturnValue({
  upload: mockUpload,
  getPublicUrl: mockGetPublicUrl,
  remove: mockRemove,
});

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    storage: {
      from: mockStorageFrom,
    },
  })),
}));

describe('SupabaseStorageService local (sin credenciales Supabase)', () => {
  let uploadsDir: string;

  const file = {
    originalname: 'photo.png',
    mimetype: 'image/png',
    buffer: Buffer.from('file'),
  } as Express.Multer.File;

  beforeEach(async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_KEY;

    uploadsDir = join(process.cwd(), 'tmp-test-uploads', `${Date.now()}-${Math.random()}`);
    process.env.UPLOADS_DIR = uploadsDir;

    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    delete process.env.UPLOADS_DIR;
    await fs.rm(uploadsDir, { recursive: true, force: true });
  });

  it('UploadRecipeImage_CuandoUploadOk_DebeGuardarArchivoLocalYRetornarUrlPublica', async () => {
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    const service = new SupabaseStorageService();

    const result = await service.uploadRecipeImage(file, 'r1');

    expect(result).toMatch(/^\/uploads\/recipes\/r1\/1700000000000-[a-f0-9]{16}\.png$/);
    const relativePath = result.replace('/uploads/', '');
    await expect(fs.readFile(join(uploadsDir, relativePath))).resolves.toEqual(file.buffer);

    dateSpy.mockRestore();
  });

  it('UploadRecipeImage_CuandoRecipeIdTieneCaracteresInvalidos_DebeSanitizarRuta', async () => {
    const service = new SupabaseStorageService();

    const result = await service.uploadRecipeImage(file, '../recipe id');

    expect(result).toContain('/uploads/recipes/___recipe_id/');
  });

  it('UploadAvatar_CuandoUploadOk_DebeGuardarAvatarYRetornarUrlPublica', async () => {
    const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    const service = new SupabaseStorageService();

    const result = await service.uploadAvatar(file, 'user name');

    expect(result).toBe('/uploads/avatars/user_name-1700000000000.png');
    await expect(fs.readFile(join(uploadsDir, 'avatars', 'user_name-1700000000000.png'))).resolves.toEqual(file.buffer);

    dateSpy.mockRestore();
  });

  it('DeleteFile_CuandoRecibeUrlPublica_DebeEliminarArchivoLocal', async () => {
    const service = new SupabaseStorageService();
    await fs.mkdir(join(uploadsDir, 'recipes', 'r1'), { recursive: true });
    await fs.writeFile(join(uploadsDir, 'recipes', 'r1', 'img.png'), file.buffer);

    await service.deleteFile('http://localhost:3000/uploads/recipes/r1/img.png');

    await expect(fs.access(join(uploadsDir, 'recipes', 'r1', 'img.png'))).rejects.toThrow();
  });

  it('DeleteFile_CuandoNoExiste_NoDebeLanzarError', async () => {
    const service = new SupabaseStorageService();

    await expect(service.deleteFile('/uploads/recipes/r1/no-existe.png')).resolves.toBeUndefined();
  });

  it('DeleteFile_CuandoRutaSaleDelDirectorio_DebeIgnorarYAdvertir', async () => {
    const service = new SupabaseStorageService();

    await expect(service.deleteFile('../package.json')).resolves.toBeUndefined();

    expect(Logger.prototype.warn).toHaveBeenCalled();
  });
});

describe('SupabaseStorageService con Supabase activo', () => {
  const file = {
    originalname: 'photo.png',
    mimetype: 'image/png',
    buffer: Buffer.from('file'),
  } as Express.Multer.File;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SUPABASE_URL = 'https://fake-project.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'fake-key';
    process.env.SUPABASE_AVATARS_BUCKET = 'avatars';
    process.env.SUPABASE_RECIPES_BUCKET = 'recipes';

    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockImplementation((path: string) => ({
      data: { publicUrl: `https://fake-project.supabase.co/storage/v1/object/public/test/${path}` },
    }));
    mockRemove.mockResolvedValue({ error: null });

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_KEY;
    delete process.env.SUPABASE_AVATARS_BUCKET;
    delete process.env.SUPABASE_RECIPES_BUCKET;
  });

  it('UploadRecipeImage_CuandoSupabaseActivo_DebeSubirAlBucketRecipes', async () => {
    const service = new SupabaseStorageService();
    const result = await service.uploadRecipeImage(file, 'recipe-123');

    expect(result).toContain('https://fake-project.supabase.co/storage/v1/object/public/');
    expect(mockStorageFrom).toHaveBeenCalledWith('recipes');
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^recipe-123\/.+\.png$/),
      file.buffer,
      { contentType: 'image/png', upsert: false },
    );
  });

  it('UploadAvatar_CuandoSupabaseActivo_DebeSubirAlBucketAvatars', async () => {
    const service = new SupabaseStorageService();
    const result = await service.uploadAvatar(file, 'chef_juan');

    expect(result).toContain('https://fake-project.supabase.co/storage/v1/object/public/');
    expect(mockStorageFrom).toHaveBeenCalledWith('avatars');
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^chef_juan-\d+\.png$/),
      file.buffer,
      { contentType: 'image/png', upsert: true },
    );
  });

  it('UploadCookingExperienceImage_CuandoSupabaseActivo_DebeSubirAlBucketRecipes', async () => {
    const service = new SupabaseStorageService();
    const result = await service.uploadCookingExperienceImage(file, 'u1', 'r1');

    expect(result).toContain('https://fake-project.supabase.co/storage/v1/object/public/');
    expect(mockStorageFrom).toHaveBeenCalledWith('recipes');
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^experiences\/u1\/r1\/.+\.png$/),
      file.buffer,
      { contentType: 'image/png', upsert: false },
    );
  });

  it('DeleteFile_CuandoEsUrlSupabase_DebeRemoverDelBucketCorrecto', async () => {
    const service = new SupabaseStorageService();
    const url = 'https://fake-project.supabase.co/storage/v1/object/public/recipes/r1/image.png';

    await service.deleteFile(url);

    expect(mockStorageFrom).toHaveBeenCalledWith('recipes');
    expect(mockRemove).toHaveBeenCalledWith(['r1/image.png']);
  });
});
