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

  /** Every day at 8 AM — remind dentists about tomorrow's appointments */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async appointmentReminders(): Promise<void> {
    this.logger.log('Running appointment reminder cron...');
    let created = 0;

    try {
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

      this.logger.log(`Found ${appointments.length} appointments for tomorrow`);

      if (appointments.length === 0) {
        this.logger.log('Appointment reminder cron completed. No appointments for tomorrow.');
        return;
      }

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

        // Also notify clinic admins so they see it in their bell
        const admins = await this.prisma.user.findMany({
          where: { clinic_id: appt.clinic_id, role: { in: ['Admin', 'SuperAdmin'] }, status: 'active' },
          select: { id: true },
        });
        for (const admin of admins) {
          // Avoid duplicate if dentist IS the admin
          if (admin.id === appt.dentist_id) continue;
          notifications.push({
            clinic_id: appt.clinic_id,
            user_id: admin.id,
            type: 'appointment_reminder',
            title: 'Appointment Tomorrow',
            body: `Dr. ${appt.dentist.name} has an appointment with ${appt.patient.first_name} ${appt.patient.last_name} at ${appt.start_time}.`,
            metadata: { appointment_id: appt.id, patient_id: appt.patient_id },
          });
        }
      }

      if (notifications.length > 0) {
        created = await this.notificationService.createMany(notifications);
        this.logger.log(`Created ${created} appointment reminder notifications`);
      }
    } catch (e) {
      this.logger.error(`Appointment reminder cron failed: ${(e as Error).message}`, (e as Error).stack);
    }

    this.logger.log(`Appointment reminder cron completed. Created: ${created}`);
  }

  /** Every day at 9 AM — check for overdue installments */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async paymentOverdueAlerts(): Promise<void> {
    this.logger.log('Running payment overdue cron...');
    let created = 0;

    try {
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

      this.logger.log(`Found ${overdueItems.length} overdue installment items`);

      if (overdueItems.length === 0) {
        this.logger.log('Payment overdue cron completed. No overdue items.');
        return;
      }

      // Group by clinic and notify admins
      const byClinic = new Map<string, typeof overdueItems>();
      for (const item of overdueItems) {
        const clinicId = item.plan.invoice.clinic_id;
        if (!byClinic.has(clinicId)) byClinic.set(clinicId, []);
        byClinic.get(clinicId)!.push(item);
      }

      const notifications: CreateNotificationInput[] = [];
      for (const [clinicId, items] of byClinic) {
        const admins = await this.prisma.user.findMany({
          where: { clinic_id: clinicId, role: { in: ['Admin', 'SuperAdmin'] }, status: 'active' },
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
        created = await this.notificationService.createMany(notifications);
        this.logger.log(`Created ${created} overdue payment alerts`);
      }
    } catch (e) {
      this.logger.error(`Payment overdue cron failed: ${(e as Error).message}`, (e as Error).stack);
    }

    this.logger.log(`Payment overdue cron completed. Created: ${created}`);
  }

  /** Every day at 7 AM — check for low inventory */
  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async lowInventoryAlerts(): Promise<void> {
    this.logger.log('Running low inventory cron...');
    let created = 0;

    try {
      const lowItems = await this.prisma.$queryRaw<
        Array<{ id: string; clinic_id: string; branch_id: string; name: string; quantity: number; reorder_level: number }>
      >`
        SELECT id, clinic_id, branch_id, name, quantity, reorder_level
        FROM inventory_items
        WHERE reorder_level > 0 AND quantity <= reorder_level
      `;

      this.logger.log(`Found ${lowItems.length} low inventory items`);

      if (lowItems.length === 0) {
        this.logger.log('Low inventory cron completed. No low stock items.');
        return;
      }

      // Group by clinic
      const byClinic = new Map<string, typeof lowItems>();
      for (const item of lowItems) {
        if (!byClinic.has(item.clinic_id)) byClinic.set(item.clinic_id, []);
        byClinic.get(item.clinic_id)!.push(item);
      }

      const notifications: CreateNotificationInput[] = [];
      for (const [clinicId, items] of byClinic) {
        const admins = await this.prisma.user.findMany({
          where: { clinic_id: clinicId, role: { in: ['Admin', 'SuperAdmin'] }, status: 'active' },
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
        created = await this.notificationService.createMany(notifications);
        this.logger.log(`Created ${created} low inventory alerts`);
      }
    } catch (e) {
      this.logger.error(`Low inventory cron failed: ${(e as Error).message}`, (e as Error).stack);
    }

    this.logger.log(`Low inventory cron completed. Created: ${created}`);
  }
}
