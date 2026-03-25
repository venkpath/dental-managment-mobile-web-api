"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BackupService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const config_1 = require("@nestjs/config");
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
let BackupService = BackupService_1 = class BackupService {
    configService;
    logger = new common_1.Logger(BackupService_1.name);
    backupDir;
    retentionDays;
    constructor(configService) {
        this.configService = configService;
        this.backupDir = process.env['BACKUP_DIR'] || '/backups';
        this.retentionDays = parseInt(process.env['BACKUP_RETENTION_DAYS'] || '30', 10);
    }
    async scheduledBackup() {
        this.logger.log('Starting scheduled database backup...');
        try {
            const filename = await this.createBackup();
            this.logger.log(`Backup created: ${filename}`);
            await this.cleanOldBackups();
        }
        catch (error) {
            this.logger.error('Scheduled backup failed', error instanceof Error ? error.stack : String(error));
        }
    }
    async createBackup() {
        const databaseUrl = this.configService.get('database.url');
        if (!databaseUrl) {
            throw new Error('DATABASE_URL is not configured');
        }
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `dental_backup_${timestamp}.sql.gz`;
        const filepath = path.join(this.backupDir, filename);
        const command = `pg_dump "${databaseUrl}" --no-owner --no-acl | gzip > "${filepath}"`;
        await execAsync(command);
        const stats = fs.statSync(filepath);
        if (stats.size === 0) {
            fs.unlinkSync(filepath);
            throw new Error('Backup file is empty');
        }
        this.logger.log(`Backup size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        return filename;
    }
    async cleanOldBackups() {
        if (!fs.existsSync(this.backupDir))
            return 0;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
        const files = fs.readdirSync(this.backupDir);
        let removed = 0;
        for (const file of files) {
            if (!file.startsWith('dental_backup_'))
                continue;
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
    listBackups() {
        if (!fs.existsSync(this.backupDir))
            return [];
        return fs.readdirSync(this.backupDir)
            .filter((f) => f.startsWith('dental_backup_'))
            .map((filename) => {
            const stats = fs.statSync(path.join(this.backupDir, filename));
            return { filename, size: stats.size, created: stats.mtime };
        })
            .sort((a, b) => b.created.getTime() - a.created.getTime());
    }
};
exports.BackupService = BackupService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_2AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], BackupService.prototype, "scheduledBackup", null);
exports.BackupService = BackupService = BackupService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], BackupService);
//# sourceMappingURL=backup.service.js.map