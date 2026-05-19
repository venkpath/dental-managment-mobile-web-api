"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_js_1 = require("../../database/prisma.service.js");
let ReportsService = class ReportsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    _summaryCache = new Map();
    async getDashboardSummary(clinicId, branchId, dentistId, referenceDate) {
        const cacheKey = `${clinicId}:${branchId ?? ''}:${dentistId ?? ''}`;
        const cached = this._summaryCache.get(cacheKey);
        if (cached && Date.now() < cached.expiresAt)
            return cached.data;
        const now = referenceDate ?? new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const tomorrowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const tomorrowStr = `${tomorrowDate.getFullYear()}-${pad(tomorrowDate.getMonth() + 1)}-${pad(tomorrowDate.getDate())}`;
        const today = new Date(todayStr);
        const tomorrow = new Date(tomorrowStr);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const branchFilter = branchId || null;
        const dentistFilter = dentistId || null;
        const invoiceDentistFilter = dentistFilter ? { dentist_id: dentistFilter } : {};
        const [todayAppointments, todayRevenue, pendingInvoices, pendingInvoicesAgg, partiallyPaidAgg, partiallyPaidPaymentsAgg, lowInventoryItems, monthExpenses, monthRevenue, monthRefunds] = await Promise.all([
            this.prisma.appointment.count({
                where: {
                    clinic_id: clinicId,
                    appointment_date: { gte: today, lt: tomorrow },
                    status: { not: 'cancelled' },
                    ...(branchFilter && { branch_id: branchFilter }),
                    ...(dentistFilter && { dentist_id: dentistFilter }),
                },
            }),
            this.prisma.payment.aggregate({
                _sum: { amount: true },
                where: {
                    invoice: {
                        clinic_id: clinicId,
                        ...(branchFilter && { branch_id: branchFilter }),
                        ...invoiceDentistFilter,
                    },
                    paid_at: { gte: today, lt: tomorrow },
                },
            }),
            this.prisma.invoice.count({
                where: {
                    clinic_id: clinicId,
                    status: { in: ['pending', 'partially_paid'] },
                    ...(branchFilter && { branch_id: branchFilter }),
                    ...invoiceDentistFilter,
                },
            }),
            this.prisma.invoice.aggregate({
                _sum: { net_amount: true },
                where: {
                    clinic_id: clinicId,
                    status: 'pending',
                    ...(branchFilter && { branch_id: branchFilter }),
                    ...invoiceDentistFilter,
                },
            }),
            this.prisma.invoice.aggregate({
                _sum: { net_amount: true },
                where: {
                    clinic_id: clinicId,
                    status: 'partially_paid',
                    ...(branchFilter && { branch_id: branchFilter }),
                    ...invoiceDentistFilter,
                },
            }),
            this.prisma.payment.aggregate({
                _sum: { amount: true },
                where: {
                    invoice: {
                        clinic_id: clinicId,
                        status: 'partially_paid',
                        ...(branchFilter && { branch_id: branchFilter }),
                        ...invoiceDentistFilter,
                    },
                },
            }),
            this.prisma.$queryRaw `
          SELECT COUNT(*)::bigint as count
          FROM inventory_items
          WHERE clinic_id = ${clinicId}::uuid
            AND quantity <= reorder_level
            ${branchFilter ? client_1.Prisma.sql `AND branch_id = ${branchFilter}::uuid` : client_1.Prisma.empty}
        `,
            this.prisma.expense.aggregate({
                _sum: { amount: true },
                where: {
                    clinic_id: clinicId,
                    date: { gte: monthStart, lte: monthEnd },
                    ...(branchFilter && { branch_id: branchFilter }),
                },
            }),
            this.prisma.payment.aggregate({
                _sum: { amount: true },
                where: {
                    invoice: {
                        clinic_id: clinicId,
                        ...(branchFilter && { branch_id: branchFilter }),
                        ...invoiceDentistFilter,
                    },
                    paid_at: { gte: monthStart, lte: monthEnd },
                },
            }),
            this.prisma.refund.aggregate({
                _sum: { amount: true },
                where: {
                    invoice: {
                        clinic_id: clinicId,
                        ...(branchFilter && { branch_id: branchFilter }),
                        ...invoiceDentistFilter,
                    },
                    refunded_at: { gte: monthStart, lte: monthEnd },
                },
            }),
        ]);
        const thisMonthExpenses = Number(monthExpenses._sum.amount ?? 0);
        const thisMonthRevenue = Number(monthRevenue._sum.amount ?? 0);
        const thisMonthRefunds = Number(monthRefunds._sum.amount ?? 0);
        const pendingNet = Number(pendingInvoicesAgg._sum.net_amount ?? 0);
        const partiallyPaidNet = Number(partiallyPaidAgg._sum.net_amount ?? 0);
        const partiallyPaidCollected = Number(partiallyPaidPaymentsAgg._sum.amount ?? 0);
        const outstandingAmount = Math.max(0, pendingNet + (partiallyPaidNet - partiallyPaidCollected));
        const result = {
            today_appointments: todayAppointments,
            today_revenue: Number(todayRevenue._sum.amount ?? 0),
            pending_invoices: pendingInvoices,
            outstanding_amount: outstandingAmount,
            low_inventory_count: Number(lowInventoryItems[0]?.count ?? 0),
            this_month_expenses: thisMonthExpenses,
            this_month_revenue: thisMonthRevenue,
            this_month_refunds: thisMonthRefunds,
            net_profit: thisMonthRevenue - thisMonthExpenses - thisMonthRefunds,
        };
        this._summaryCache.set(cacheKey, { data: result, expiresAt: Date.now() + 30_000 });
        return result;
    }
    async getDashboardBootstrap(clinicId, branchId, dentistId, days = 7) {
        const todayStr = (() => {
            const d = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        })();
        const todayDate = new Date(todayStr);
        const [summary, sparklines, todayAppointments] = await Promise.all([
            this.getDashboardSummary(clinicId, branchId, dentistId),
            this.getDashboardSparklines(clinicId, branchId, dentistId, days),
            this.prisma.appointment.findMany({
                where: {
                    clinic_id: clinicId,
                    appointment_date: todayDate,
                    ...(branchId ? { branch_id: branchId } : {}),
                    ...(dentistId ? { dentist_id: dentistId } : {}),
                },
                orderBy: [{ appointment_date: 'asc' }, { start_time: 'asc' }],
                include: { patient: true, dentist: true, branch: true },
                take: 50,
            }),
        ]);
        return {
            summary,
            sparklines,
            today_appointments: {
                data: todayAppointments,
                meta: {
                    total: todayAppointments.length,
                    page: 1,
                    limit: 50,
                    totalPages: 1,
                },
            },
        };
    }
    async getTodayPaymentBreakdown(clinicId, branchId, dentistId) {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        const rows = await this.prisma.$queryRaw `
      SELECT p.method, SUM(p.amount)::float as total
      FROM payments p
      JOIN invoices i ON p.invoice_id = i.id
      WHERE i.clinic_id = ${clinicId}::uuid
        AND DATE(p.paid_at) = ${todayStr}::date
        ${branchId ? client_1.Prisma.sql `AND i.branch_id = ${branchId}::uuid` : client_1.Prisma.empty}
        ${dentistId ? client_1.Prisma.sql `AND i.dentist_id = ${dentistId}::uuid` : client_1.Prisma.empty}
      GROUP BY p.method
    `;
        const out = { cash: 0, card: 0, upi: 0, other: 0, total: 0 };
        for (const r of rows) {
            const v = Number(r.total) || 0;
            out.total += v;
            if (r.method === 'cash')
                out.cash += v;
            else if (r.method === 'card')
                out.card += v;
            else if (r.method === 'upi')
                out.upi += v;
            else
                out.other += v;
        }
        return out;
    }
    async getDashboardSparklines(clinicId, branchId, dentistId, days = 7) {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const localStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        const windowDays = Math.min(Math.max(Number.isFinite(days) ? days : 7, 7), 365);
        const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const days7Ago = new Date(todayLocal);
        days7Ago.setDate(days7Ago.getDate() - (windowDays - 1));
        const days7AgoStr = localStr(days7Ago);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const branchFilter = branchId || null;
        const invoiceDentistFilter = dentistId ? { dentist_id: dentistId } : {};
        const [rawRevenue, rawAppointments, rawExpenses, lastMonthRev, lastMonthExp, lastMonthRef, thisMonthRev, thisMonthExp, thisMonthRef, thisMonthOutstanding, lastMonthOutstanding] = await Promise.all([
            this.prisma.$queryRaw `
          SELECT TO_CHAR(DATE(p.paid_at), 'YYYY-MM-DD') as day,
                 SUM(p.amount)::float as total
          FROM payments p
          JOIN invoices i ON p.invoice_id = i.id
          WHERE i.clinic_id = ${clinicId}::uuid
            AND DATE(p.paid_at) >= ${days7AgoStr}::date
            ${branchFilter ? client_1.Prisma.sql `AND i.branch_id = ${branchFilter}::uuid` : client_1.Prisma.empty}
            ${dentistId ? client_1.Prisma.sql `AND i.dentist_id = ${dentistId}::uuid` : client_1.Prisma.empty}
          GROUP BY 1 ORDER BY 1
        `,
            this.prisma.$queryRaw `
          SELECT TO_CHAR(appointment_date, 'YYYY-MM-DD') as day,
                 COUNT(*)::float as total
          FROM appointments
          WHERE clinic_id = ${clinicId}::uuid
            AND appointment_date >= ${days7AgoStr}::date
            AND status != 'cancelled'
            ${branchFilter ? client_1.Prisma.sql `AND branch_id = ${branchFilter}::uuid` : client_1.Prisma.empty}
            ${dentistId ? client_1.Prisma.sql `AND dentist_id = ${dentistId}::uuid` : client_1.Prisma.empty}
          GROUP BY 1 ORDER BY 1
        `,
            this.prisma.$queryRaw `
          SELECT TO_CHAR(date, 'YYYY-MM-DD') as day,
                 SUM(amount)::float as total
          FROM expenses
          WHERE clinic_id = ${clinicId}::uuid
            AND date >= ${days7AgoStr}::date
            ${branchFilter ? client_1.Prisma.sql `AND branch_id = ${branchFilter}::uuid` : client_1.Prisma.empty}
          GROUP BY 1 ORDER BY 1
        `,
            this.prisma.payment.aggregate({
                _sum: { amount: true },
                where: { invoice: { clinic_id: clinicId, ...(branchFilter && { branch_id: branchFilter }), ...invoiceDentistFilter }, paid_at: { gte: lastMonthStart, lte: lastMonthEnd } },
            }),
            this.prisma.expense.aggregate({
                _sum: { amount: true },
                where: { clinic_id: clinicId, date: { gte: lastMonthStart, lte: lastMonthEnd }, ...(branchFilter && { branch_id: branchFilter }) },
            }),
            this.prisma.refund.aggregate({
                _sum: { amount: true },
                where: { invoice: { clinic_id: clinicId, ...(branchFilter && { branch_id: branchFilter }), ...invoiceDentistFilter }, refunded_at: { gte: lastMonthStart, lte: lastMonthEnd } },
            }),
            this.prisma.payment.aggregate({
                _sum: { amount: true },
                where: { invoice: { clinic_id: clinicId, ...(branchFilter && { branch_id: branchFilter }), ...invoiceDentistFilter }, paid_at: { gte: thisMonthStart, lte: thisMonthEnd } },
            }),
            this.prisma.expense.aggregate({
                _sum: { amount: true },
                where: { clinic_id: clinicId, date: { gte: thisMonthStart, lte: thisMonthEnd }, ...(branchFilter && { branch_id: branchFilter }) },
            }),
            this.prisma.refund.aggregate({
                _sum: { amount: true },
                where: { invoice: { clinic_id: clinicId, ...(branchFilter && { branch_id: branchFilter }), ...invoiceDentistFilter }, refunded_at: { gte: thisMonthStart, lte: thisMonthEnd } },
            }),
            this.prisma.invoice.aggregate({
                _sum: { net_amount: true },
                where: { clinic_id: clinicId, status: { in: ['pending', 'partially_paid'] }, created_at: { gte: thisMonthStart, lte: thisMonthEnd }, ...(branchFilter && { branch_id: branchFilter }), ...invoiceDentistFilter },
            }),
            this.prisma.invoice.aggregate({
                _sum: { net_amount: true },
                where: { clinic_id: clinicId, status: { in: ['pending', 'partially_paid'] }, created_at: { gte: lastMonthStart, lte: lastMonthEnd }, ...(branchFilter && { branch_id: branchFilter }), ...invoiceDentistFilter },
            }),
        ]);
        const revMap = new Map(rawRevenue.map(r => [r.day, Number(r.total)]));
        const apptMap = new Map(rawAppointments.map(r => [r.day, Number(r.total)]));
        const expMap = new Map(rawExpenses.map(r => [r.day, Number(r.total)]));
        const daily = Array.from({ length: windowDays }, (_, i) => {
            const d = new Date(days7Ago);
            d.setDate(d.getDate() + i);
            const ds = localStr(d);
            return { date: ds, revenue: revMap.get(ds) ?? 0, appointments: apptMap.get(ds) ?? 0, expenses: expMap.get(ds) ?? 0 };
        });
        const pct = (curr, prev) => {
            if (prev === 0 && curr === 0)
                return null;
            if (prev === 0)
                return 100;
            return Math.round(((curr - prev) / prev) * 1000) / 10;
        };
        const lastMonthRevVal = Number(lastMonthRev._sum.amount ?? 0);
        const lastMonthExpVal = Number(lastMonthExp._sum.amount ?? 0);
        const lastMonthRefVal = Number(lastMonthRef._sum.amount ?? 0);
        const thisMonthRevVal = Number(thisMonthRev._sum.amount ?? 0);
        const thisMonthExpVal = Number(thisMonthExp._sum.amount ?? 0);
        const thisMonthRefVal = Number(thisMonthRef._sum.amount ?? 0);
        const thisMonthOutstandingVal = Number(thisMonthOutstanding._sum.net_amount ?? 0);
        const lastMonthOutstandingVal = Number(lastMonthOutstanding._sum.net_amount ?? 0);
        return {
            daily,
            trends: {
                today_revenue_vs_yesterday: pct(daily[6].revenue, daily[5].revenue),
                today_appointments_vs_yesterday: pct(daily[6].appointments, daily[5].appointments),
                outstanding_vs_last_month: pct(thisMonthOutstandingVal, lastMonthOutstandingVal),
                month_revenue_vs_last_month: pct(thisMonthRevVal, lastMonthRevVal),
                month_expenses_vs_last_month: pct(thisMonthExpVal, lastMonthExpVal),
                net_profit_vs_last_month: pct(thisMonthRevVal - thisMonthExpVal - thisMonthRefVal, lastMonthRevVal - lastMonthExpVal - lastMonthRefVal),
            },
        };
    }
    async getRevenueReport(clinicId, query) {
        const startDate = new Date(query.start_date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(query.end_date);
        endDate.setHours(23, 59, 59, 999);
        const invoiceWhere = {
            clinic_id: clinicId,
            created_at: { gte: startDate, lte: endDate },
            ...(query.branch_id && { branch_id: query.branch_id }),
            ...(query.dentist_id && {
                items: { some: { treatment: { dentist_id: query.dentist_id } } },
            }),
        };
        const [paidAgg, partiallyPaidAgg, pendingAgg, pendingCount, paidCount, partiallyPaidCount, paymentsAgg] = await Promise.all([
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
            this.prisma.invoice.aggregate({
                _sum: { net_amount: true },
                where: { ...invoiceWhere, status: 'pending' },
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
        const pendingNetTotal = Number(pendingAgg._sum.net_amount ?? 0);
        const outstandingAmount = (paidNetTotal + partiallyPaidNetTotal + pendingNetTotal) - paidPayments;
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
    async getAppointmentAnalytics(clinicId, query) {
        const startDate = new Date(query.start_date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(query.end_date);
        endDate.setHours(23, 59, 59, 999);
        const baseWhere = {
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
    async getDentistPerformance(clinicId, query) {
        const startDate = new Date(query.start_date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(query.end_date);
        endDate.setHours(23, 59, 59, 999);
        const branchFilter = query.branch_id ? query.branch_id : null;
        const dentistFilter = query.dentist_id ? query.dentist_id : null;
        const results = await this.prisma.$queryRaw `
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
            ${branchFilter ? client_1.Prisma.sql `AND a.branch_id = ${branchFilter}::uuid` : client_1.Prisma.empty}
        ) AS appointments_handled,
        (
          SELECT COUNT(*)::bigint
          FROM treatments t
          WHERE t.dentist_id = u.id
            AND t.clinic_id = ${clinicId}::uuid
            AND t.created_at >= ${startDate}
            AND t.created_at <= ${endDate}
            ${branchFilter ? client_1.Prisma.sql `AND t.branch_id = ${branchFilter}::uuid` : client_1.Prisma.empty}
        ) AS treatments_performed,
        (
          SELECT COALESCE(SUM(t2.cost), 0)
          FROM treatments t2
          WHERE t2.dentist_id = u.id
            AND t2.clinic_id = ${clinicId}::uuid
            AND t2.created_at >= ${startDate}
            AND t2.created_at <= ${endDate}
            ${branchFilter ? client_1.Prisma.sql `AND t2.branch_id = ${branchFilter}::uuid` : client_1.Prisma.empty}
        ) AS revenue_generated
      FROM users u
      WHERE u.clinic_id = ${clinicId}::uuid
        AND (u.role IN ('Dentist', 'Consultant') OR u.is_doctor = true)
        AND u.status = 'active'
        ${dentistFilter ? client_1.Prisma.sql `AND u.id = ${dentistFilter}::uuid` : client_1.Prisma.empty}
        ${branchFilter ? client_1.Prisma.sql `AND (u.branch_id = ${branchFilter}::uuid OR u.branch_id IS NULL)` : client_1.Prisma.empty}
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
    async getPatientAnalytics(clinicId, query) {
        const startDate = new Date(query.start_date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(query.end_date);
        endDate.setHours(23, 59, 59, 999);
        const baseWhere = {
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
    async getTreatmentAnalytics(clinicId, query) {
        const startDate = new Date(query.start_date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(query.end_date);
        endDate.setHours(23, 59, 59, 999);
        const branchFilter = query.branch_id ? query.branch_id : null;
        const dentistFilter = query.dentist_id ? query.dentist_id : null;
        const procedures = await this.prisma.$queryRaw `
      SELECT procedure, COUNT(*)::bigint as count
      FROM treatments
      WHERE clinic_id = ${clinicId}::uuid
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
        ${branchFilter ? client_1.Prisma.sql `AND branch_id = ${branchFilter}::uuid` : client_1.Prisma.empty}
        ${dentistFilter ? client_1.Prisma.sql `AND dentist_id = ${dentistFilter}::uuid` : client_1.Prisma.empty}
      GROUP BY procedure
      ORDER BY count DESC
    `;
        const mostCommon = procedures.map((p) => ({
            procedure: p.procedure,
            count: Number(p.count),
        }));
        return {
            most_common_procedures: mostCommon,
            procedure_counts: mostCommon.length,
        };
    }
    async getInventoryAlerts(clinicId, branchId) {
        const branchFilter = branchId || null;
        const items = await this.prisma.$queryRaw `
      SELECT id, name, category, quantity, reorder_level, unit, branch_id
      FROM inventory_items
      WHERE clinic_id = ${clinicId}::uuid
        AND quantity <= reorder_level
        ${branchFilter ? client_1.Prisma.sql `AND branch_id = ${branchFilter}::uuid` : client_1.Prisma.empty}
      ORDER BY (reorder_level - quantity) DESC
    `;
        return items;
    }
    async getProfitLoss(clinicId, query) {
        const startDate = new Date(query.start_date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(query.end_date);
        endDate.setHours(23, 59, 59, 999);
        const branchFilter = query.branch_id
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
    async getProfitLossMonthly(clinicId, query) {
        const startDate = new Date(query.start_date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(query.end_date);
        endDate.setHours(23, 59, 59, 999);
        const branchFilter = query.branch_id || null;
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
        const revenueByMonth = new Map();
        for (const p of payments) {
            const d = new Date(p.paid_at);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + Number(p.amount));
        }
        const expenseByMonth = new Map();
        for (const e of expenses) {
            const d = new Date(e.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            expenseByMonth.set(key, (expenseByMonth.get(key) ?? 0) + Number(e.amount));
        }
        const result = [];
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
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map