import { AppModule } from '../app.module';
import { AuthModule } from '../auth/auth.module';
import { RecipesModule } from '../recipes/recipes.module';
import { UserModule } from '../user/user.module';
import { UploadsModule } from '../uploads/uploads.module';
import { SeederModule } from '../seeder/seeder.module';
import { CookingJournalModule } from '../cooking-journal/cooking-journal.module';
import { CreateAuthDto } from '../auth/dto/create-auth.dto';
import { UpdateAuthDto } from '../auth/dto/update-auth.dto';
import { Auth } from '../auth/entities/auth.entity';

describe('Modules and DTOs', () => {
  it('Modules_CuandoSeImportan_DebenEstarDefinidos', () => {
    // Arrange
    const modules = [
      AppModule,
      AuthModule,
      RecipesModule,
      UserModule,
      UploadsModule,
      SeederModule,
      CookingJournalModule,
    ];

    // Act
    const result = modules.every((m) => m !== undefined);

    // Assert
    expect(result).toBe(true);
  });

  it('AuthDtos_CuandoSeInstancian_DebenExistir', () => {
    // Arrange
    const createDto = new CreateAuthDto();
    const updateDto = new UpdateAuthDto();

    // Act
    createDto.id = 'a1';

    // Assert
    expect(createDto).toBeDefined();
    expect(createDto.id).toBe('a1');
    expect(updateDto).toBeDefined();
  });

  it('AuthEntity_CuandoSeInstancia_DebeSerDefinido', () => {
    // Arrange
    const entity = new Auth();

    // Act
    const result = entity instanceof Auth;

    // Assert
    expect(result).toBe(true);
  });
});