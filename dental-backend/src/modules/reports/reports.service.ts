import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import {
  RevenueQueryDto,
  AppointmentAnalyticsQueryDto,
  DentistPerformanceQueryDto,
  PatientAnalyticsQueryDto,
  TreatmentAnalyticsQueryDto,
} from './dto/index.js';

export interface DashboardSummary {
  today_appointments: number;
  today_revenue: number;
  pending_invoices: number;
  low_inventory_count: number;
}

export interface AppointmentAnalytics {
  total_appointments: number;
  completed: number;
  cancelled: number;
  no_show: number;
}

export interface DentistPerformanceItem {
  dentist_id: string;
  dentist_name: string;
  appointments_handled: number;
  treatments_performed: number;
  revenue_generated: number;
}

export interface PatientAnalytics {
  new_patients: number;
  returning_patients: number;
  total_patients: number;
}

export interface ProcedureCount {
  procedure: string;
  count: number;
}

export interface TreatmentAnalytics {
  most_common_procedures: ProcedureCount[];
  procedure_counts: number;
}

export interface InventoryAlertItem {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  reorder_level: number;
  unit: string;
  branch_id: string;
}

export interface RevenueReport {
  total_revenue: number;
  paid_invoices: number;
  pending_invoices: number;
  tax_collected: number;
  discount_given: number;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardSummary(clinicId: string): Promise<DashboardSummary> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayAppointments, todayRevenue, pendingInvoices, lowInventoryItems] =
      await Promise.all([
        this.prisma.appointment.count({
          where: {
            clinic_id: clinicId,
            appointment_date: { gte: today, lt: tomorrow },
          },
        }),

        this.prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            invoice: { clinic_id: clinicId },
            paid_at: { gte: today, lt: tomorrow },
          },
        }),

        this.prisma.invoice.count({
          where: {
            clinic_id: clinicId,
            status: 'pending',
          },
        }),

        this.prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*)::bigint as count
          FROM inventory_items
          WHERE clinic_id = ${clinicId}::uuid
            AND quantity <= reorder_level
        `,
      ]);

    return {
      today_appointments: todayAppointments,
      today_revenue: Number(todayRevenue._sum.amount ?? 0),
      pending_invoices: pendingInvoices,
      low_inventory_count: Number(lowInventoryItems[0]?.count ?? 0),
    };
  }

  async getRevenueReport(clinicId: string, query: RevenueQueryDto): Promise<RevenueReport> {
    const startDate = new Date(query.start_date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(query.end_date);
    endDate.setHours(23, 59, 59, 999);

    const invoiceWhere: Prisma.InvoiceWhereInput = {
      clinic_id: clinicId,
      created_at: { gte: startDate, lte: endDate },
      ...(query.branch_id && { branch_id: query.branch_id }),
      ...(query.dentist_id && {
        items: { some: { treatment: { dentist_id: query.dentist_id } } },
      }),
    };

    const [paidAgg, pendingCount, paidCount] = await Promise.all([
      this.prisma.invoice.aggregate({
        _sum: {
          net_amount: true,
          tax_amount: true,
          discount_amount: true,
        },
        where: { ...invoiceWhere, status: 'paid' },
      }),

      this.prisma.invoice.count({
        where: { ...invoiceWhere, status: 'pending' },
      }),

      this.prisma.invoice.count({
        where: { ...invoiceWhere, status: 'paid' },
      }),
    ]);

    return {
      total_revenue: Number(paidAgg._sum.net_amount ?? 0),
      paid_invoices: paidCount,
      pending_invoices: pendingCount,
      tax_collected: Number(paidAgg._sum.tax_amount ?? 0),
      discount_given: Number(paidAgg._sum.discount_amount ?? 0),
    };
  }

  async getAppointmentAnalytics(
    clinicId: string,
    query: AppointmentAnalyticsQueryDto,
  ): Promise<AppointmentAnalytics> {
    const startDate = new Date(query.start_date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(query.end_date);
    endDate.setHours(23, 59, 59, 999);

    const baseWhere: Prisma.AppointmentWhereInput = {
      clinic_id: clinicId,
      appointment_date: { gte: startDate, lte: endDate },
      ...(query.branch_id && { branch_id: query.branch_id }),
      ...(query.dentist_id && { dentist_id: query.dentist_id }),
    };

    const [total, completed, cancelled, noShow] = await Promise.all([
      this.prisma.appointment.count({ where: baseWhere }),
      this.prisma.appointment.count({ where: { ...baseWhere, status: 'completed' } }),
      this.prisma.appointment.count({ where: { ...baseWhere, status: 'cancelled' } }),
      this.prisma.appointment.count({ where: { ...baseWhere, status: 'no_show' } }),
    ]);

    return {
      total_appointments: total,
      completed,
      cancelled,
      no_show: noShow,
    };
  }

  async getDentistPerformance(
    clinicId: string,
    query: DentistPerformanceQueryDto,
  ): Promise<DentistPerformanceItem[]> {
    const startDate = new Date(query.start_date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(query.end_date);
    endDate.setHours(23, 59, 59, 999);

    const branchFilter = query.branch_id ? query.branch_id : null;

    const results = await this.prisma.$queryRaw<
      {
        dentist_id: string;
        dentist_name: string;
        appointments_handled: bigint;
        treatments_performed: bigint;
        revenue_generated: number | null;
      }[]
    >`
      SELECT
        u.id AS dentist_id,
        u.name AS dentist_name,
        (
          SELECT COUNT(*)::bigint
          FROM appointments a
          WHERE a.dentist_id = u.id
            AND a.clinic_id = ${clinicId}::uuid
            AND a.appointment_date >= ${startDate}
            AND a.appointment_date <= ${endDate}
            ${branchFilter ? Prisma.sql`AND a.branch_id = ${branchFilter}::uuid` : Prisma.empty}
        ) AS appointments_handled,
        (
          SELECT COUNT(*)::bigint
          FROM treatments t
          WHERE t.dentist_id = u.id
            AND t.clinic_id = ${clinicId}::uuid
            AND t.created_at >= ${startDate}
            AND t.created_at <= ${endDate}
            ${branchFilter ? Prisma.sql`AND t.branch_id = ${branchFilter}::uuid` : Prisma.empty}
        ) AS treatments_performed,
        (
          SELECT COALESCE(SUM(t2.cost), 0)
          FROM treatments t2
          WHERE t2.dentist_id = u.id
            AND t2.clinic_id = ${clinicId}::uuid
            AND t2.created_at >= ${startDate}
            AND t2.created_at <= ${endDate}
            ${branchFilter ? Prisma.sql`AND t2.branch_id = ${branchFilter}::uuid` : Prisma.empty}
        ) AS revenue_generated
      FROM users u
      WHERE u.clinic_id = ${clinicId}::uuid
        AND u.role = 'dentist'
        AND u.status = 'active'
        ${branchFilter ? Prisma.sql`AND u.branch_id = ${branchFilter}::uuid` : Prisma.empty}
      ORDER BY revenue_generated DESC
    `;

    return results.map((r) => ({
      dentist_id: r.dentist_id,
      dentist_name: r.dentist_name,
      appointments_handled: Number(r.appointments_handled),
      treatments_performed: Number(r.treatments_performed),
      revenue_generated: Number(r.revenue_generated ?? 0),
    }));
  }

  async getPatientAnalytics(
    clinicId: string,
    query: PatientAnalyticsQueryDto,
  ): Promise<PatientAnalytics> {
    const startDate = new Date(query.start_date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(query.end_date);
    endDate.setHours(23, 59, 59, 999);

    const baseWhere: Prisma.PatientWhereInput = {
      clinic_id: clinicId,
      ...(query.branch_id && { branch_id: query.branch_id }),
    };

    const [newPatients, totalPatients, patientsWithAppointments] = await Promise.all([
      this.prisma.patient.count({
        where: {
          ...baseWhere,
          created_at: { gte: startDate, lte: endDate },
        },
      }),

      this.prisma.patient.count({
        where: baseWhere,
      }),

      this.prisma.patient.count({
        where: {
          ...baseWhere,
          created_at: { lt: startDate },
          appointments: {
            some: {
              appointment_date: { gte: startDate, lte: endDate },
            },
          },
        },
      }),
    ]);

    return {
      new_patients: newPatients,
      returning_patients: patientsWithAppointments,
      total_patients: totalPatients,
    };
  }

  async getTreatmentAnalytics(
    clinicId: string,
    query: TreatmentAnalyticsQueryDto,
  ): Promise<TreatmentAnalytics> {
    const startDate = new Date(query.start_date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(query.end_date);
    endDate.setHours(23, 59, 59, 999);

    const branchFilter = query.branch_id ? query.branch_id : null;
    const dentistFilter = query.dentist_id ? query.dentist_id : null;

    const procedures = await this.prisma.$queryRaw<
      { procedure: string; count: bigint }[]
    >`
      SELECT procedure, COUNT(*)::bigint as count
      FROM treatments
      WHERE clinic_id = ${clinicId}::uuid
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
        ${branchFilter ? Prisma.sql`AND branch_id = ${branchFilter}::uuid` : Prisma.empty}
        ${dentistFilter ? Prisma.sql`AND dentist_id = ${dentistFilter}::uuid` : Prisma.empty}
      GROUP BY procedure
      ORDER BY count DESC
    `;

    const mostCommon: ProcedureCount[] = procedures.map((p) => ({
      procedure: p.procedure,
      count: Number(p.count),
    }));

    return {
      most_common_procedures: mostCommon,
      procedure_counts: mostCommon.length,
    };
  }

  async getInventoryAlerts(
    clinicId: string,
    branchId?: string,
  ): Promise<InventoryAlertItem[]> {
    const branchFilter = branchId || null;

    const items = await this.prisma.$queryRaw<
      {
        id: string;
        name: string;
        category: string | null;
        quantity: number;
        reorder_level: number;
        unit: string;
        branch_id: string;
      }[]
    >`
      SELECT id, name, category, quantity, reorder_level, unit, branch_id
      FROM inventory_items
      WHERE clinic_id = ${clinicId}::uuid
        AND quantity <= reorder_level
        ${branchFilter ? Prisma.sql`AND branch_id = ${branchFilter}::uuid` : Prisma.empty}
      ORDER BY (reorder_level - quantity) DESC
    `;

    return items;
  }
}
