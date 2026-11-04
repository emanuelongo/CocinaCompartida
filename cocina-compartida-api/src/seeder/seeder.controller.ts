import { Controller, Get, Post, Query } from '@nestjs/common';
import { SeederService } from './seeder.service';

@Controller('seeder')
export class SeederController {
  constructor(private readonly seederService: SeederService) {}

  @Get('run')
  @Post('run')
  async runSeeder(@Query('force') force?: string) {
    const isForce = force === 'true' || force === '1';
    return await this.seederService.seed(isForce);
  }
}

