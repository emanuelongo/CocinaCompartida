// src/users/users.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from 'src/security/auth.guard';
import { RoleGuard } from 'src/security/role.guard';
import { UpdateAccessibilityPreferencesDto } from './dto/update-accessibility-preferences.dto';

@Controller('users')
export class UserController {
  constructor(private readonly usersService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @UseGuards(AuthGuard)
  @Patch()
  update(@Body() updateUserDto: UpdateUserDto, @Req() req: any) {
    return this.usersService.update(req.user.id, updateUserDto);
  }

  @UseGuards(AuthGuard)
  @Get('me/accessibility')
  getAccessibilityPreferences(@Req() req: any) {
    return this.usersService.getAccessibilityPreferences(req.user.id);
  }

  @UseGuards(AuthGuard)
  @Patch('me/accessibility')
  updateAccessibilityPreferences(
    @Body() dto: UpdateAccessibilityPreferencesDto,
    @Req() req: any,
  ) {
    return this.usersService.updateAccessibilityPreferences(req.user.id, dto);
  }

  @UseGuards(AuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /**
   * Endpoint de testing: permite eliminar usuario por email SIN autenticación
   * Solo usar en ambiente de testing/QA
   * Ejemplo: DELETE /users/test-email/test@example.com
   * IMPORTANTE: Esta ruta debe ir ANTES de DELETE :id para evitar conflictos
   */
  @Delete('test-email/:email')
  @HttpCode(HttpStatus.OK)
  removeByEmailForTesting(@Param('email') email: string) {
    return this.usersService.removeByEmail(email);
  }

  @UseGuards(AuthGuard, RoleGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}