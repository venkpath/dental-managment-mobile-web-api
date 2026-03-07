import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

export interface DashboardSummary {
  today_appointments: number;
  today_revenue: number;
  pending_invoices: number;
  low_inventory_count: number;
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
}
