import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { NotificationService, CreateNotificationInput } from './notification.service.js';
import { PushNotificationService } from './push-notification.service.js';
import { UserRole } from '../user/dto/index.js';

function formatTime12(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

@Injectable()
export class AppointmentStaffNotificationService {
  private readonly logger = new Logger(AppointmentStaffNotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  /** In-app + push when a new appointment is booked (confirmed / scheduled). */
  async notifyAppointmentConfirmed(clinicId: string, appointmentId: string): Promise<void> {
    try {
      const appt = await this.loadAppointment(appointmentId, clinicId);
      if (!appt || appt.status === 'cancelled') return;

      const patientName = `${appt.patient.first_name} ${appt.patient.last_name}`.trim();
      const dateStr = formatDate(appt.appointment_date);
      const timeStr = formatTime12(appt.start_time);
      const title = 'Appointment confirmed';
      const body = `${patientName} — ${dateStr} at ${timeStr}`;

      await this.notifyStaffRecipients(appt.clinic_id, appt.dentist_id, {
        type: 'appointment_confirmed',
        title,
        body,
        metadata: { appointment_id: appt.id, patient_id: appt.patient_id },
        dentistBody: `New appointment with ${patientName} on ${dateStr} at ${timeStr}.`,
        adminBody: `Dr. ${appt.dentist.name} — ${patientName} on ${dateStr} at ${timeStr}.`,
      });
    } catch (e) {
      this.logger.warn(
        `Staff appointment confirmed notification failed for ${appointmentId}: ${(e as Error).message}`,
      );
    }
  }

  /** In-app + push 30 minutes before the appointment starts. */
  async notifyAppointmentReminder30Min(clinicId: string, appointmentId: string): Promise<void> {
    try {
      const appt = await this.loadAppointment(appointmentId, clinicId);
      if (!appt || appt.status === 'cancelled') return;

      const patientName = `${appt.patient.first_name} ${appt.patient.last_name}`.trim();
      const timeStr = formatTime12(appt.start_time);
      const title = 'Appointment in 30 minutes';
      const body = `${patientName} at ${timeStr}`;

      await this.notifyStaffRecipients(appt.clinic_id, appt.dentist_id, {
        type: 'appointment_reminder',
        title,
        body,
        metadata: { appointment_id: appt.id, patient_id: appt.patient_id, minutes_before: 30 },
        dentistBody: `Reminder: ${patientName} at ${timeStr} (in 30 min).`,
        adminBody: `Reminder: Dr. ${appt.dentist.name} with ${patientName} at ${timeStr} (in 30 min).`,
      });
    } catch (e) {
      this.logger.warn(
        `Staff 30min reminder failed for ${appointmentId}: ${(e as Error).message}`,
      );
    }
  }

  private async loadAppointment(appointmentId: string, clinicId: string) {
    return this.prisma.appointment.findFirst({
      where: { id: appointmentId, clinic_id: clinicId },
      include: {
        patient: { select: { id: true, first_name: true, last_name: true } },
        dentist: { select: { id: true, name: true } },
      },
    });
  }

  private async notifyStaffRecipients(
    clinicId: string,
    dentistId: string,
    input: {
      type: string;
      title: string;
      body: string;
      metadata: Record<string, unknown>;
      dentistBody: string;
      adminBody: string;
    },
  ): Promise<void> {
    const admins = await this.prisma.user.findMany({
      where: {
        clinic_id: clinicId,
        role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
        status: 'active',
      },
      select: { id: true },
    });

    const notifications: CreateNotificationInput[] = [
      {
        clinic_id: clinicId,
        user_id: dentistId,
        type: input.type,
        title: input.title,
        body: input.dentistBody,
        metadata: input.metadata,
      },
    ];

    for (const admin of admins) {
      if (admin.id === dentistId) continue;
      notifications.push({
        clinic_id: clinicId,
        user_id: admin.id,
        type: input.type,
        title: input.title,
        body: input.adminBody,
        metadata: input.metadata,
      });
    }

    await this.notificationService.createMany(notifications);

    const pushData: Record<string, string> = {
      type: input.type,
      appointment_id: String(input.metadata.appointment_id ?? ''),
    };
    if (input.metadata.patient_id) {
      pushData.patient_id = String(input.metadata.patient_id);
    }

    await this.pushNotificationService.sendToUser(dentistId, {
      title: input.title,
      body: input.dentistBody,
      data: pushData,
    });

    const adminIds = admins.filter((a) => a.id !== dentistId).map((a) => a.id);
    if (adminIds.length > 0) {
      await this.pushNotificationService.sendToUsers(adminIds, {
        title: input.title,
        body: input.adminBody,
        data: pushData,
      });
    }
  }
}
