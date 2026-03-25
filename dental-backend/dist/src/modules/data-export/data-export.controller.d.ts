import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface.js';
import { DataExportService } from './data-export.service.js';
export declare class DataExportController {
    private readonly dataExportService;
    constructor(dataExportService: DataExportService);
    exportClinicData(user: JwtPayload, res: Response): Promise<StreamableFile>;
}
