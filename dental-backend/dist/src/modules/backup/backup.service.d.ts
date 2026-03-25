import { ConfigService } from '@nestjs/config';
export declare class BackupService {
    private readonly configService;
    private readonly logger;
    private readonly backupDir;
    private readonly retentionDays;
    constructor(configService: ConfigService);
    scheduledBackup(): Promise<void>;
    createBackup(): Promise<string>;
    cleanOldBackups(): Promise<number>;
    listBackups(): {
        filename: string;
        size: number;
        created: Date;
    }[];
}
