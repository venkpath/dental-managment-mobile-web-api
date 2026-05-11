import { PrismaService } from '../../database/prisma.service.js';
import { QrCodeService } from '../branch/qr-code.service.js';
import { PlanLimitService } from '../../common/services/plan-limit.service.js';
import { SelfRegisterPatientDto } from './dto/self-register-patient.dto.js';
export declare class PatientSelfRegisterController {
    private readonly prisma;
    private readonly qrCodeService;
    private readonly planLimit;
    constructor(prisma: PrismaService, qrCodeService: QrCodeService, planLimit: PlanLimitService);
    getBranchInfo(token: string): Promise<{
        branch_name: string;
        clinic_name: string;
        city: string;
        logo_path: string | null;
    }>;
    selfRegister(token: string, dto: SelfRegisterPatientDto): Promise<{
        success: boolean;
        message: string;
        already_registered: boolean;
        patient_id?: undefined;
    } | {
        success: boolean;
        message: string;
        already_registered: boolean;
        patient_id: string;
    }>;
}
