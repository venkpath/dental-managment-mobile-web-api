import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { DatabaseSeederService } from './database-seeder.service.js';

@Global()
@Module({
  providers: [PrismaService, DatabaseSeederService],
  exports: [PrismaService],
})
export class PrismaModule {}
