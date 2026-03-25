import { BackupService } from './backup.service.js';
export declare class BackupController {
    private readonly backupService;
    constructor(backupService: BackupService);
    createBackup(): Promise<{
        filename: string;
        message: string;
    }>;
    listBackups(): {
        filename: string;
        size: number;
        created: Date;
    }[];
}
