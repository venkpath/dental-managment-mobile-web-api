import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

type MonthlyResource = 'patients' | 'appointments';

@Injectable()
export class PlanLimitService {
  constructor(private readonly prisma: PrismaService) {}

  async enforceMonthlyCap(clinicId: string, resource: MonthlyResource, additional = 1): Promise<void> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        plan: {
          select: {
            name: true,
            max_patients_per_month: true,
            max_appointments_per_month: true,
          },
        },
      },
    });

    if (!clinic?.plan) return;

    const cap =
      resource === 'patients'
        ? clinic.plan.max_patients_per_month
        : clinic.plan.max_appointments_per_month;

    if (cap == null) return; // unlimited

    const { start, end } = monthRange();
    const used =
      resource === 'patients'
        ? await this.prisma.patient.count({
            where: { clinic_id: clinicId, created_at: { gte: start, lt: end } },
          })
        : await this.prisma.appointment.count({
            where: { clinic_id: clinicId, created_at: { gte: start, lt: end } },
          });

    if (used + additional > cap) {
      const label = resource === 'patients' ? 'new patients' : 'appointments';
      throw new ForbiddenException(
        `Monthly limit reached: your ${clinic.plan.name} plan allows ${cap} ${label} per month (used ${used}). Upgrade to continue.`,
      );
    }
  }
}

function monthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return { start, end };
}
