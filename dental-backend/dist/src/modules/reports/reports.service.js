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
    async getDashboardSummary(clinicId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const [todayAppointments, todayRevenue, pendingInvoices, lowInventoryItems] = await Promise.all([
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
            this.prisma.$queryRaw `
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
        AND u.role = 'dentist'
        AND u.status = 'active'
        ${branchFilter ? client_1.Prisma.sql `AND u.branch_id = ${branchFilter}::uuid` : client_1.Prisma.empty}
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
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map