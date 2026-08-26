import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateAccessibilityPreferencesDto } from './dto/update-accessibility-preferences.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  private omitPassword(user: User) {
    if (!user) return null;
    const { password, ...data } = user;
    return data;
  }

  async create(dto: CreateUserDto) {
    const exists = await this.userRepo.findOne({
      where: { username: dto.username },
    });
    if (exists) throw new ConflictException('Username exists');

    if (dto.email) {
      const emailExists = await this.userRepo.findOne({
        where: { email: dto.email },
      });
      if (emailExists) throw new ConflictException('Email already exists');
    }

    const hash = await bcrypt.hash(dto.password, 10);

    const user = this.userRepo.create({ ...dto, password: hash });
    await this.userRepo.save(user);

    return this.omitPassword(user);
  }

  async findAll() {
    const users = await this.userRepo.find();
    return users.map((u) => this.omitPassword(u));
  }

  async findOne(id: string) {
    let user: User | null;
    try {
      user = await this.userRepo.findOne({ where: { id } });
    } catch {
      throw new InternalServerErrorException(
        'Error al consultar la base de datos',
      );
    }
    if (!user) throw new NotFoundException();
    return this.omitPassword(user);
  }

  async findByEmail(email: string) {
    const user = await this.userRepo.findOne({
      where: { email },
      select: ['id', 'username', 'password', 'email', 'avatar'],
    });
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    if (dto.email) {
      const emailExists = await this.userRepo.findOne({
        where: { email: dto.email },
      });
      if (emailExists && emailExists.id !== id)
        throw new ConflictException('Email already exists');
    }

    await this.userRepo.update({ id }, dto);

    if (!dto || Object.keys(dto).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    const updated = await this.userRepo.findOne({ where: { id } });
    if (!updated) throw new NotFoundException();
    return this.omitPassword(updated);
  }

  async getAccessibilityPreferences(id: string) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.toAccessibilityPreferences(user);
  }

  async updateAccessibilityPreferences(
    id: string,
    dto: UpdateAccessibilityPreferencesDto,
  ) {
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('No hay preferencias para actualizar');
    }

    const result = await this.userRepo.update({ id }, dto);
    if (!result.affected) throw new NotFoundException('Usuario no encontrado');

    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return this.toAccessibilityPreferences(user);
  }

  private toAccessibilityPreferences(user: User) {
    return {
      readingAssistantEnabled: user.readingAssistantEnabled ?? false,
      autoReadEnabled: user.autoReadEnabled ?? false,
      speechRate: user.speechRate ?? 1,
      preferredVoice: user.preferredVoice ?? null,
    };
  }

  async remove(id: string) {
    const result = await this.userRepo.softDelete(id);
    if (!result.affected) throw new NotFoundException();
    return { success: true, message: 'User removed' };
  }

  async removeByEmail(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user)
      throw new NotFoundException(`Usuario con email ${email} no encontrado`);

    const result = await this.userRepo.delete(user.id);
    if (!result.affected)
      throw new InternalServerErrorException('Error al eliminar usuario');

    return { success: true, message: 'User removed', userId: user.id };
  }
}