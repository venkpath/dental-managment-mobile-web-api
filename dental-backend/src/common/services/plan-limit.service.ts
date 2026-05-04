import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

type MonthlyResource = 'patients' | 'appointments' | 'invoices' | 'treatments' | 'prescriptions' | 'consultations';

// Grace cap for Free plan during the 30-day trial window
const FREE_TRIAL_CAP = 20;

@Injectable()
export class PlanLimitService {
  constructor(private readonly prisma: PrismaService) {}

  async enforceMonthlyCap(clinicId: string, resource: MonthlyResource, additional = 1): Promise<void> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        trial_ends_at: true,
        custom_patient_limit: true,
        custom_appointment_limit: true,
        custom_invoice_limit: true,
        custom_treatment_limit: true,
        custom_prescription_limit: true,
        custom_consultation_limit: true,
        plan: {
          select: {
            name: true,
            max_patients_per_month: true,
            max_appointments_per_month: true,
            max_invoices_per_month: true,
            max_treatments_per_month: true,
            max_prescriptions_per_month: true,
            max_consultations_per_month: true,
          },
        },
      },
    });

    if (!clinic?.plan) return;

    // Free plan grace window: during the 30-day trial (trial_ends_at) every
    // resource gets 20/month. After trial_ends_at they settle at the plan
    // default (10). Other plans are completely unaffected.
    const isFreePlan = clinic.plan.name === 'Free';
    const withinTrial =
      isFreePlan &&
      clinic.trial_ends_at != null &&
      new Date() < new Date(clinic.trial_ends_at);

    // Per-clinic custom limit (super admin override) takes precedence over everything.
    // If not set, use grace cap during trial, otherwise fall back to plan default.
    const planCap = withinTrial
      ? FREE_TRIAL_CAP
      : resource === 'patients'
      ? clinic.plan.max_patients_per_month
      : resource === 'appointments'
      ? clinic.plan.max_appointments_per_month
      : resource === 'invoices'
      ? clinic.plan.max_invoices_per_month
      : resource === 'treatments'
      ? clinic.plan.max_treatments_per_month
      : resource === 'prescriptions'
      ? clinic.plan.max_prescriptions_per_month
      : clinic.plan.max_consultations_per_month;

    const customCap =
      resource === 'patients'
        ? clinic.custom_patient_limit
        : resource === 'appointments'
        ? clinic.custom_appointment_limit
        : resource === 'invoices'
        ? clinic.custom_invoice_limit
        : resource === 'treatments'
        ? clinic.custom_treatment_limit
        : resource === 'prescriptions'
        ? clinic.custom_prescription_limit
        : clinic.custom_consultation_limit;

    const cap = customCap ?? planCap;

    if (cap == null) return; // unlimited

    const { start, end } = monthRange();
    const used =
      resource === 'patients'
        ? await this.prisma.patient.count({
            where: { clinic_id: clinicId, created_at: { gte: start, lt: end } },
          })
        : resource === 'appointments'
        ? await this.prisma.appointment.count({
            where: { clinic_id: clinicId, created_at: { gte: start, lt: end } },
          })
        : resource === 'invoices'
        ? await this.prisma.invoice.count({
            where: { clinic_id: clinicId, created_at: { gte: start, lt: end } },
          })
        : resource === 'treatments'
        ? await this.prisma.treatment.count({
            where: { clinic_id: clinicId, created_at: { gte: start, lt: end } },
          })
        : resource === 'prescriptions'
        ? await this.prisma.prescription.count({
            where: { clinic_id: clinicId, created_at: { gte: start, lt: end } },
          })
        : await this.prisma.clinicalVisit.count({
            where: { clinic_id: clinicId, created_at: { gte: start, lt: end } },
          });

    if (used + additional > cap) {
      const label =
        resource === 'patients'
          ? 'new patients'
          : resource === 'appointments'
          ? 'appointments'
          : resource === 'invoices'
          ? 'invoices'
          : resource === 'treatments'
          ? 'treatments'
          : resource === 'prescriptions'
          ? 'prescriptions'
          : 'consultations';
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
