import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir: string;
  private readonly retentionDays: number;

  constructor(private readonly configService: ConfigService) {
    this.backupDir = process.env['BACKUP_DIR'] || '/backups';
    this.retentionDays = parseInt(process.env['BACKUP_RETENTION_DAYS'] || '30', 10);
  }

  /**
   * Daily automated database backup at 2:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledBackup(): Promise<void> {
    this.logger.log('Starting scheduled database backup...');
    try {
      const filename = await this.createBackup();
      this.logger.log(`Backup created: ${filename}`);
      await this.cleanOldBackups();
    } catch (error) {
      this.logger.error('Scheduled backup failed', error instanceof Error ? error.stack : String(error));
    }
  }

  /**
   * Create a pg_dump backup of the database
   */
  async createBackup(): Promise<string> {
    const databaseUrl = this.configService.get<string>('database.url');
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not configured');
    }

    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `dental_backup_${timestamp}.sql.gz`;
    const filepath = path.join(this.backupDir, filename);

    const command = `pg_dump "${databaseUrl}" --no-owner --no-acl | gzip > "${filepath}"`;

    await execAsync(command);

    // Verify file was created and has content
    const stats = fs.statSync(filepath);
    if (stats.size === 0) {
      fs.unlinkSync(filepath);
      throw new Error('Backup file is empty');
    }

    this.logger.log(`Backup size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    return filename;
  }

  /**
   * Clean backups older than retention period
   */
  async cleanOldBackups(): Promise<number> {
    if (!fs.existsSync(this.backupDir)) return 0;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    const files = fs.readdirSync(this.backupDir);
    let removed = 0;

    for (const file of files) {
      if (!file.startsWith('dental_backup_')) continue;
      const filepath = path.join(this.backupDir, file);
      const stats = fs.statSync(filepath);
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filepath);
        removed++;
        this.logger.log(`Removed old backup: ${file}`);
      }
    }

    return removed;
  }

  /**
   * List all existing backups
   */
  listBackups(): { filename: string; size: number; created: Date }[] {
    if (!fs.existsSync(this.backupDir)) return [];

    return fs.readdirSync(this.backupDir)
      .filter((f) => f.startsWith('dental_backup_'))
      .map((filename) => {
        const stats = fs.statSync(path.join(this.backupDir, filename));
        return { filename, size: stats.size, created: stats.mtime };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime());
  }
}
