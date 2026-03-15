import { Controller, Get, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SuperAdmin } from '../../common/decorators/super-admin.decorator.js';
import { BackupService } from './backup.service.js';

@ApiTags('Backup')
@Controller('backup')
@ApiBearerAuth()
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @SuperAdmin()
  @ApiOperation({ summary: 'Trigger manual database backup' })
  async createBackup() {
    const filename = await this.backupService.createBackup();
    return { filename, message: 'Backup created successfully' };
  }

  @Get()
  @SuperAdmin()
  @ApiOperation({ summary: 'List all backups' })
  listBackups() {
    return this.backupService.listBackups();
  }
}
