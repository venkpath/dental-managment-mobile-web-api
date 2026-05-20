import { JwtService } from '@nestjs/jwt';
export declare class InsuranceFileService {
    private readonly jwt;
    private readonly logger;
    constructor(jwt: JwtService);
    save(params: {
        clinicId: string;
        subdir: string;
        file: Express.Multer.File;
    }): Promise<{
        file_url: string;
        file_name: string;
        original_name: string;
        mime_type: string;
        size_bytes: number;
    }>;
    remove(filePath: string | null | undefined): Promise<void>;
    buildDownloadUrl(params: {
        clinicId: string;
        filePath: string;
        expiresInSec?: number;
    }): {
        token: string;
    };
    resolveForServing(params: {
        clinicId: string;
        filePath: string;
        token: string;
    }): string;
    private resolveSafe;
}
