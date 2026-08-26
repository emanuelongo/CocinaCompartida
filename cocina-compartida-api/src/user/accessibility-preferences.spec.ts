import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('Accessibility preferences', () => {
  const storedPreferences = {
    readingAssistantEnabled: true,
    autoReadEnabled: false,
    speechRate: 1.25,
    preferredVoice: 'Google español',
  };

  let repository: {
    findOne: jest.Mock;
    update: jest.Mock;
  };
  let service: UserService;

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      update: jest.fn(),
    };
    service = new UserService(repository as never);
  });

  it('consulta únicamente las preferencias del usuario autenticado', async () => {
    repository.findOne.mockResolvedValue({
      id: 'user-1',
      ...storedPreferences,
    });

    await expect(
      service.getAccessibilityPreferences('user-1'),
    ).resolves.toEqual(storedPreferences);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'user-1' },
    });
  });

  it('actualiza y devuelve las preferencias normalizadas', async () => {
    repository.update.mockResolvedValue({ affected: 1 });
    repository.findOne.mockResolvedValue({
      id: 'user-1',
      ...storedPreferences,
    });

    const result = await service.updateAccessibilityPreferences('user-1', {
      readingAssistantEnabled: true,
      speechRate: 1.25,
    });

    expect(repository.update).toHaveBeenCalledWith(
      { id: 'user-1' },
      { readingAssistantEnabled: true, speechRate: 1.25 },
    );
    expect(result).toEqual(storedPreferences);
  });

  it('rechaza una actualización vacía', async () => {
    await expect(
      service.updateAccessibilityPreferences('user-1', {}),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza usuarios inexistentes', async () => {
    repository.findOne.mockResolvedValue(null);
    await expect(
      service.getAccessibilityPreferences('missing'),
    ).rejects.toThrow(NotFoundException);
  });

  it('el controlador usa siempre el identificador del token', async () => {
    const serviceMock = {
      updateAccessibilityPreferences: jest
        .fn()
        .mockResolvedValue(storedPreferences),
    };
    const controller = new UserController(serviceMock as never);
    const dto = { autoReadEnabled: true };

    await controller.updateAccessibilityPreferences(dto, {
      user: { id: 'token-user' },
    });

    expect(serviceMock.updateAccessibilityPreferences).toHaveBeenCalledWith(
      'token-user',
      dto,
    );
  });
});