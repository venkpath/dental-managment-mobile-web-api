import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

export interface ClinicDataExport {
  exportedAt: string;
  clinic: Record<string, unknown>;
  branches: Record<string, unknown>[];
  users: Record<string, unknown>[];
  patients: Record<string, unknown>[];
  appointments: Record<string, unknown>[];
  treatments: Record<string, unknown>[];
  prescriptions: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  inventoryItems: Record<string, unknown>[];
}

@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async exportClinicData(clinicId: string): Promise<ClinicDataExport> {
    this.logger.log(`Exporting all data for clinic ${clinicId}`);

    const [clinic, branches, users, patients, appointments, treatments, prescriptions, invoices, inventoryItems] =
      await Promise.all([
        this.prisma.clinic.findUnique({ where: { id: clinicId } }),
        this.prisma.branch.findMany({ where: { clinic_id: clinicId } }),
        this.prisma.user.findMany({
          where: { clinic_id: clinicId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            branch_id: true,
            created_at: true,
            // Exclude password_hash for security
          },
        }),
        this.prisma.patient.findMany({ where: { clinic_id: clinicId } }),
        this.prisma.appointment.findMany({ where: { clinic_id: clinicId } }),
        this.prisma.treatment.findMany({ where: { clinic_id: clinicId } }),
        this.prisma.prescription.findMany({ where: { clinic_id: clinicId } }),
        this.prisma.invoice.findMany({ where: { clinic_id: clinicId } }),
        this.prisma.inventoryItem.findMany({ where: { clinic_id: clinicId } }),
      ]);

    return {
      exportedAt: new Date().toISOString(),
      clinic: (clinic as Record<string, unknown>) || {},
      branches: branches as unknown as Record<string, unknown>[],
      users: users as unknown as Record<string, unknown>[],
      patients: patients as unknown as Record<string, unknown>[],
      appointments: appointments as unknown as Record<string, unknown>[],
      treatments: treatments as unknown as Record<string, unknown>[],
      prescriptions: prescriptions as unknown as Record<string, unknown>[],
      invoices: invoices as unknown as Record<string, unknown>[],
      inventoryItems: inventoryItems as unknown as Record<string, unknown>[],
    };
  }
}
