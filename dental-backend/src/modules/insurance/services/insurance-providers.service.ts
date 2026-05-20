import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';

/**
 * Read-only catalogue of insurance providers + plans available to a clinic.
 *
 * Returns the union of:
 *   - global rows (clinic_id = null) — seeded for everyone (CGHS, Star, ...)
 *   - the clinic's own rows (clinic_id = X) — for custom corporate EHS the
 *     clinic added themselves
 *
 * Used by the empanelment dropdown, the patient-insurance picker, and the
 * claim builder.
 */
@Injectable()
export class InsuranceProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  /** List active providers visible to a clinic, optionally filtered by country. */
  async listProviders(clinicId: string, opts: { country?: string; type?: string } = {}) {
    const where: { is_active: boolean; OR: object[]; country?: string; type?: string } = {
      is_active: true,
      OR: [{ clinic_id: null }, { clinic_id: clinicId }],
    };
    if (opts.country) where.country = opts.country.toUpperCase();
    if (opts.type) where.type = opts.type;

    return this.prisma.insuranceProvider.findMany({
      where,
      orderBy: [{ country: 'asc' }, { name: 'asc' }],
      include: {
        plans: {
          where: { is_active: true },
          orderBy: { plan_name: 'asc' },
          // Carry the procedure-code count so the UI can decide whether to
          // expose the "Rate card" viewer without a second round-trip.
          include: { _count: { select: { procedure_codes: true } } },
        },
      },
    });
  }

  /** Single provider lookup (includes all its plans). */
  async getProvider(clinicId: string, id: string) {
    const provider = await this.prisma.insuranceProvider.findUnique({
      where: { id },
      include: { plans: true },
    });
    if (!provider || (provider.clinic_id !== null && provider.clinic_id !== clinicId)) {
      throw new NotFoundException('Insurance provider not found');
    }
    return provider;
  }

  /** Single plan lookup with provider + procedure codes (for the claim engine). */
  async getPlan(clinicId: string, planId: string) {
    const plan = await this.prisma.insurancePlan.findUnique({
      where: { id: planId },
      include: {
        provider: true,
        procedure_codes: true,
      },
    });
    if (!plan) throw new NotFoundException('Insurance plan not found');
    if (plan.provider.clinic_id !== null && plan.provider.clinic_id !== clinicId) {
      throw new NotFoundException('Insurance plan not found');
    }
    return plan;
  }
}
