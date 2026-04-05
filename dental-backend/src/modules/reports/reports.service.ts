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
  this_month_expenses: number;
  this_month_revenue: number;
  net_profit: number;
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
  partially_paid_invoices: number;
  outstanding_amount: number;
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

    // First day of current month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const [todayAppointments, todayRevenue, pendingInvoices, lowInventoryItems, monthExpenses, monthRevenue] =
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
            status: { in: ['pending', 'partially_paid'] },
          },
        }),

        this.prisma.$queryRaw<[{ count: bigint }]>`
          SELECT COUNT(*)::bigint as count
          FROM inventory_items
          WHERE clinic_id = ${clinicId}::uuid
            AND quantity <= reorder_level
        `,

        this.prisma.expense.aggregate({
          _sum: { amount: true },
          where: {
            clinic_id: clinicId,
            date: { gte: monthStart, lte: monthEnd },
          },
        }),

        this.prisma.payment.aggregate({
          _sum: { amount: true },
          where: {
            invoice: { clinic_id: clinicId },
            paid_at: { gte: monthStart, lte: monthEnd },
          },
        }),
      ]);

    const thisMonthExpenses = Number(monthExpenses._sum.amount ?? 0);
    const thisMonthRevenue = Number(monthRevenue._sum.amount ?? 0);

    return {
      today_appointments: todayAppointments,
      today_revenue: Number(todayRevenue._sum.amount ?? 0),
      pending_invoices: pendingInvoices,
      low_inventory_count: Number(lowInventoryItems[0]?.count ?? 0),
      this_month_expenses: thisMonthExpenses,
      this_month_revenue: thisMonthRevenue,
      net_profit: thisMonthRevenue - thisMonthExpenses,
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

    const [paidAgg, partiallyPaidAgg, pendingCount, paidCount, partiallyPaidCount, paymentsAgg] = await Promise.all([
      this.prisma.invoice.aggregate({
        _sum: {
          net_amount: true,
          tax_amount: true,
          discount_amount: true,
        },
        where: { ...invoiceWhere, status: 'paid' },
      }),

      this.prisma.invoice.aggregate({
        _sum: {
          net_amount: true,
          tax_amount: true,
          discount_amount: true,
        },
        where: { ...invoiceWhere, status: 'partially_paid' },
      }),

      this.prisma.invoice.count({
        where: { ...invoiceWhere, status: 'pending' },
      }),

      this.prisma.invoice.count({
        where: { ...invoiceWhere, status: 'paid' },
      }),

      this.prisma.invoice.count({
        where: { ...invoiceWhere, status: 'partially_paid' },
      }),

      // Total payments collected (includes partial payments)
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          invoice: { ...invoiceWhere, status: { in: ['paid', 'partially_paid'] } },
        },
      }),
    ]);

    const totalRevenue = Number(paymentsAgg._sum.amount ?? 0);
    const partiallyPaidNetTotal = Number(partiallyPaidAgg._sum.net_amount ?? 0);
    const paidPayments = Number(paymentsAgg._sum.amount ?? 0);
    const paidNetTotal = Number(paidAgg._sum.net_amount ?? 0);
    const outstandingAmount = (paidNetTotal + partiallyPaidNetTotal) - paidPayments;

    return {
      total_revenue: totalRevenue,
      paid_invoices: paidCount,
      pending_invoices: pendingCount,
      partially_paid_invoices: partiallyPaidCount,
      outstanding_amount: Math.max(0, outstandingAmount),
      tax_collected: Number(paidAgg._sum.tax_amount ?? 0) + Number(partiallyPaidAgg._sum.tax_amount ?? 0),
      discount_given: Number(paidAgg._sum.discount_amount ?? 0) + Number(partiallyPaidAgg._sum.discount_amount ?? 0),
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

  async getProfitLoss(clinicId: string, query: RevenueQueryDto) {
    const startDate = new Date(query.start_date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(query.end_date);
    endDate.setHours(23, 59, 59, 999);

    const branchFilter: Prisma.ExpenseWhereInput = query.branch_id
      ? { branch_id: query.branch_id }
      : {};

    const [revenueAgg, expenseAgg, expenseByCategory] = await Promise.all([
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          invoice: {
            clinic_id: clinicId,
            ...(query.branch_id && { branch_id: query.branch_id }),
          },
          paid_at: { gte: startDate, lte: endDate },
        },
      }),

      this.prisma.expense.aggregate({
        _sum: { amount: true },
        _count: true,
        where: {
          clinic_id: clinicId,
          date: { gte: startDate, lte: endDate },
          ...branchFilter,
        },
      }),

      this.prisma.expense.groupBy({
        by: ['category_id'],
        where: {
          clinic_id: clinicId,
          date: { gte: startDate, lte: endDate },
          ...branchFilter,
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
    ]);

    const categoryIds = expenseByCategory.map((c) => c.category_id);
    const categories = await this.prisma.expenseCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, icon: true },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    const totalRevenue = Number(revenueAgg._sum.amount ?? 0);
    const totalExpenses = Number(expenseAgg._sum.amount ?? 0);

    return {
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_profit: totalRevenue - totalExpenses,
      profit_margin: totalRevenue > 0
        ? Math.round(((totalRevenue - totalExpenses) / totalRevenue) * 10000) / 100
        : 0,
      expense_count: expenseAgg._count,
      expense_breakdown: expenseByCategory.map((c) => ({
        category_id: c.category_id,
        category_name: categoryMap.get(c.category_id)?.name ?? 'Unknown',
        category_icon: categoryMap.get(c.category_id)?.icon ?? null,
        total: Number(c._sum.amount ?? 0),
      })),
    };
  }

  async getProfitLossMonthly(clinicId: string, query: RevenueQueryDto) {
    const startDate = new Date(query.start_date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(query.end_date);
    endDate.setHours(23, 59, 59, 999);

    const branchFilter = query.branch_id || null;

    // Fetch all payments and expenses in the range, then group by month in JS
    const [payments, expenses] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          invoice: {
            clinic_id: clinicId,
            ...(branchFilter && { branch_id: branchFilter }),
          },
          paid_at: { gte: startDate, lte: endDate },
        },
        select: { amount: true, paid_at: true },
      }),
      this.prisma.expense.findMany({
        where: {
          clinic_id: clinicId,
          date: { gte: startDate, lte: endDate },
          ...(branchFilter && { branch_id: branchFilter }),
        },
        select: { amount: true, date: true, category_id: true },
      }),
    ]);

    // Group by month
    const revenueByMonth = new Map<string, number>();
    for (const p of payments) {
      const d = new Date(p.paid_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + Number(p.amount));
    }

    const expenseByMonth = new Map<string, number>();
    for (const e of expenses) {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      expenseByMonth.set(key, (expenseByMonth.get(key) ?? 0) + Number(e.amount));
    }

    // Build full month range
    const result: {
      month: string;
      revenue: number;
      expenses: number;
      net_profit: number;
      profit_margin: number;
    }[] = [];

    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (cursor <= endDate) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const rev = revenueByMonth.get(key) ?? 0;
      const exp = expenseByMonth.get(key) ?? 0;
      const net = rev - exp;
      result.push({
        month: key,
        revenue: rev,
        expenses: exp,
        net_profit: net,
        profit_margin: rev > 0 ? Math.round((net / rev) * 10000) / 100 : 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return result;
  }
}
