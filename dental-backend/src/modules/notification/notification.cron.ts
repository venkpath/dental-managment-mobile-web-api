import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service.js';
import { NotificationService, CreateNotificationInput } from './notification.service.js';

@Injectable()
export class NotificationCronService {
  private readonly logger = new Logger(NotificationCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /** Every day at 8 AM — remind patients about tomorrow's appointments */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async appointmentReminders(): Promise<void> {
    this.logger.log('Running appointment reminder cron...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        appointment_date: { gte: tomorrow, lt: dayAfter },
        status: 'scheduled',
      },
      include: { patient: true, dentist: true },
    });

    if (appointments.length === 0) return;

    const notifications: CreateNotificationInput[] = [];
    for (const appt of appointments) {
      // Notify the dentist
      notifications.push({
        clinic_id: appt.clinic_id,
        user_id: appt.dentist_id,
        type: 'appointment_reminder',
        title: 'Appointment Tomorrow',
        body: `You have an appointment with ${appt.patient.first_name} ${appt.patient.last_name} at ${appt.start_time}.`,
        metadata: { appointment_id: appt.id, patient_id: appt.patient_id },
      });
    }

    if (notifications.length > 0) {
      await this.notificationService.createMany(notifications);
      this.logger.log(`Created ${notifications.length} appointment reminders`);
    }
  }

  /** Every day at 9 AM — check for overdue installments */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async paymentOverdueAlerts(): Promise<void> {
    this.logger.log('Running payment overdue cron...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueItems = await this.prisma.installmentItem.findMany({
      where: {
        due_date: { lt: today },
        status: 'pending',
      },
      include: {
        plan: {
          include: {
            invoice: {
              include: { patient: true },
            },
          },
        },
      },
    });

    if (overdueItems.length === 0) return;

    // Group by clinic and notify admins
    const byClinic = new Map<string, typeof overdueItems>();
    for (const item of overdueItems) {
      const clinicId = item.plan.invoice.clinic_id;
      if (!byClinic.has(clinicId)) byClinic.set(clinicId, []);
      byClinic.get(clinicId)!.push(item);
    }

    const notifications: CreateNotificationInput[] = [];
    for (const [clinicId, items] of byClinic) {
      // Get admin users for this clinic
      const admins = await this.prisma.user.findMany({
        where: { clinic_id: clinicId, role: 'admin', status: 'active' },
        select: { id: true },
      });

      for (const admin of admins) {
        notifications.push({
          clinic_id: clinicId,
          user_id: admin.id,
          type: 'payment_overdue',
          title: `${items.length} Overdue Installment(s)`,
          body: `There are ${items.length} overdue installment payments requiring attention.`,
          metadata: { installment_ids: items.map((i) => i.id) },
        });
      }

      // Mark items as overdue
      await this.prisma.installmentItem.updateMany({
        where: { id: { in: items.map((i) => i.id) } },
        data: { status: 'overdue' },
      });
    }

    if (notifications.length > 0) {
      await this.notificationService.createMany(notifications);
      this.logger.log(`Created ${notifications.length} overdue payment alerts`);
    }
  }

  /** Every day at 7 AM — check for low inventory */
  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async lowInventoryAlerts(): Promise<void> {
    this.logger.log('Running low inventory cron...');

    // Prisma doesn't support field-to-field comparison, so use raw query
    const lowItems = await this.prisma.$queryRaw<
      Array<{ id: string; clinic_id: string; branch_id: string; name: string; quantity: number; reorder_level: number }>
    >`
      SELECT id, clinic_id, branch_id, name, quantity, reorder_level
      FROM inventory_items
      WHERE reorder_level > 0 AND quantity <= reorder_level
    `;

    if (lowItems.length === 0) return;

    // Group by clinic
    const byClinic = new Map<string, typeof lowItems>();
    for (const item of lowItems) {
      if (!byClinic.has(item.clinic_id)) byClinic.set(item.clinic_id, []);
      byClinic.get(item.clinic_id)!.push(item);
    }

    const notifications: CreateNotificationInput[] = [];
    for (const [clinicId, items] of byClinic) {
      const admins = await this.prisma.user.findMany({
        where: { clinic_id: clinicId, role: 'admin', status: 'active' },
        select: { id: true },
      });

      const itemNames = items.slice(0, 3).map((i) => i.name).join(', ');
      const suffix = items.length > 3 ? ` and ${items.length - 3} more` : '';

      for (const admin of admins) {
        notifications.push({
          clinic_id: clinicId,
          user_id: admin.id,
          type: 'low_inventory',
          title: 'Low Inventory Alert',
          body: `${items.length} item(s) below reorder level: ${itemNames}${suffix}.`,
          metadata: { item_ids: items.map((i) => i.id) },
        });
      }
    }

    if (notifications.length > 0) {
      await this.notificationService.createMany(notifications);
      this.logger.log(`Created ${notifications.length} low inventory alerts`);
    }
  }
}
