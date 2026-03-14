import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { MessageChannel, MessageCategory } from '../communication/dto/send-message.dto.js';
import { AutomationService } from './automation.service.js';

@Injectable()
export class AutomationCronService {
  private readonly logger = new Logger(AutomationCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationService: CommunicationService,
    private readonly automationService: AutomationService,
  ) {}

  // ─── Birthday Greetings — Daily at 8:30 AM ───

  @Cron('0 30 8 * * *')
  async birthdayGreetings(): Promise<void> {
    this.logger.log('Running birthday greeting automation...');

    const clinics = await this.getActiveClinics();

    for (const clinic of clinics) {
      try {
        const rule = await this.automationService.getRuleConfig(clinic.id, 'birthday_greeting');
        if (!rule?.is_enabled) continue;

        const today = new Date();
        const month = today.getMonth() + 1;
        const day = today.getDate();

        const birthdayPatients = await this.prisma.$queryRaw<
          { id: string; first_name: string; last_name: string; phone: string; email: string | null }[]
        >`
          SELECT id, first_name, last_name, phone, email
          FROM patients
          WHERE clinic_id = ${clinic.id}::uuid
            AND EXTRACT(MONTH FROM date_of_birth) = ${month}
            AND EXTRACT(DAY FROM date_of_birth) = ${day}
        `;

        for (const patient of birthdayPatients) {
          try {
            const channel = await this.resolveChannel(clinic.id, patient.id, rule.channel);
            await this.communicationService.sendMessage(clinic.id, {
              patient_id: patient.id,
              channel,
              category: MessageCategory.PROMOTIONAL,
              template_id: rule.template_id ?? undefined,
              body: rule.template_id ? undefined : `Happy Birthday, ${patient.first_name}! 🎂 Wishing you a wonderful day from our clinic.`,
              variables: {
                patient_name: `${patient.first_name} ${patient.last_name}`,
                patient_first_name: patient.first_name,
                clinic_name: clinic.name,
              },
              metadata: { automation: 'birthday_greeting' },
            });
          } catch (e) {
            this.logger.warn(`Birthday greeting failed for patient ${patient.id}: ${(e as Error).message}`);
          }
        }

        if (birthdayPatients.length > 0) {
          this.logger.log(`Sent ${birthdayPatients.length} birthday greetings for clinic ${clinic.name}`);
        }
      } catch (e) {
        this.logger.error(`Birthday greeting error for clinic ${clinic.id}: ${(e as Error).message}`);
      }
    }
  }

  // ─── Festival Greetings — Daily at 8 AM ───

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async festivalGreetings(): Promise<void> {
    this.logger.log('Running festival greeting automation...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find events happening today
    const events = await this.prisma.clinicEvent.findMany({
      where: {
        is_enabled: true,
        event_date: { gte: today, lt: tomorrow },
      },
      include: { template: true },
    });

    if (events.length === 0) return;

    for (const event of events) {
      try {
        // System event → applies to all clinics with festival_greeting enabled
        // Clinic event → applies only to that clinic
        const clinicIds = event.clinic_id
          ? [event.clinic_id]
          : (await this.getActiveClinics()).map((c) => c.id);

        for (const clinicId of clinicIds) {
          const rule = await this.automationService.getRuleConfig(clinicId, 'festival_greeting');
          if (!rule?.is_enabled) continue;

          const patients = await this.prisma.patient.findMany({
            where: { clinic_id: clinicId },
            select: { id: true, first_name: true, last_name: true, phone: true, email: true },
          });

          const clinic = await this.prisma.clinic.findUnique({
            where: { id: clinicId },
            select: { name: true },
          });

          for (const patient of patients) {
            try {
              const channel = await this.resolveChannel(clinicId, patient.id, rule.channel);
              await this.communicationService.sendMessage(clinicId, {
                patient_id: patient.id,
                channel,
                category: MessageCategory.PROMOTIONAL,
                template_id: event.template_id ?? rule.template_id ?? undefined,
                body: event.template_id || rule.template_id
                  ? undefined
                  : `Wishing you a Happy ${event.event_name}! From ${clinic?.name || 'your dental clinic'}. 🎉`,
                variables: {
                  patient_name: `${patient.first_name} ${patient.last_name}`,
                  patient_first_name: patient.first_name,
                  clinic_name: clinic?.name || '',
                  festival_name: event.event_name,
                },
                metadata: { automation: 'festival_greeting', event_id: event.id },
              });
            } catch {
              // Skip individual failures
            }
          }

          this.logger.log(`Festival greeting "${event.event_name}" sent to ${patients.length} patients for clinic ${clinicId}`);
        }
      } catch (e) {
        this.logger.error(`Festival greeting error for event ${event.id}: ${(e as Error).message}`);
      }
    }
  }

  // ─── Appointment Reminders to Patients — Daily at 7:30 AM ───

  @Cron('0 30 7 * * *')
  async appointmentRemindersToPatients(): Promise<void> {
    this.logger.log('Running patient appointment reminder automation...');

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
      include: {
        patient: true,
        dentist: { select: { name: true } },
        clinic: { select: { id: true, name: true } },
        branch: { select: { name: true, address: true } },
      },
    });

    for (const appt of appointments) {
      try {
        const rule = await this.automationService.getRuleConfig(appt.clinic_id, 'appointment_reminder_patient');
        if (!rule?.is_enabled) continue;

        const channel = await this.resolveChannel(appt.clinic_id, appt.patient_id, rule.channel);
        await this.communicationService.sendMessage(appt.clinic_id, {
          patient_id: appt.patient_id,
          channel,
          category: MessageCategory.TRANSACTIONAL,
          template_id: rule.template_id ?? undefined,
          body: rule.template_id
            ? undefined
            : `Reminder: You have an appointment tomorrow at ${appt.start_time} with Dr. ${appt.dentist.name} at ${appt.clinic.name}.`,
          variables: {
            patient_name: `${appt.patient.first_name} ${appt.patient.last_name}`,
            patient_first_name: appt.patient.first_name,
            appointment_date: appt.appointment_date.toISOString().split('T')[0],
            appointment_time: appt.start_time,
            dentist_name: appt.dentist.name,
            clinic_name: appt.clinic.name,
            branch_name: appt.branch.name,
            branch_address: appt.branch.address || '',
          },
          metadata: { automation: 'appointment_reminder_patient', appointment_id: appt.id },
        });
      } catch (e) {
        this.logger.warn(`Appointment reminder failed for ${appt.patient_id}: ${(e as Error).message}`);
      }
    }

    if (appointments.length > 0) {
      this.logger.log(`Sent ${appointments.length} patient appointment reminders`);
    }
  }

  // ─── Payment Reminders (3 days before due) — Daily at 9:30 AM ───

  @Cron('0 30 9 * * *')
  async paymentReminders(): Promise<void> {
    this.logger.log('Running payment reminder automation...');

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    threeDaysFromNow.setHours(0, 0, 0, 0);

    const nextDay = new Date(threeDaysFromNow);
    nextDay.setDate(nextDay.getDate() + 1);

    const upcomingInstallments = await this.prisma.installmentItem.findMany({
      where: {
        due_date: { gte: threeDaysFromNow, lt: nextDay },
        status: 'pending',
      },
      include: {
        plan: {
          include: {
            invoice: {
              include: {
                patient: true,
                clinic: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    for (const item of upcomingInstallments) {
      const invoice = item.plan.invoice;
      try {
        const rule = await this.automationService.getRuleConfig(invoice.clinic_id, 'payment_reminder');
        if (!rule?.is_enabled) continue;

        const channel = await this.resolveChannel(invoice.clinic_id, invoice.patient_id, rule.channel);
        await this.communicationService.sendMessage(invoice.clinic_id, {
          patient_id: invoice.patient_id,
          channel,
          category: MessageCategory.TRANSACTIONAL,
          template_id: rule.template_id ?? undefined,
          body: rule.template_id
            ? undefined
            : `Reminder: Your installment of ₹${item.amount} is due on ${item.due_date.toISOString().split('T')[0]}. Please visit ${invoice.clinic.name} or contact us.`,
          variables: {
            patient_name: `${invoice.patient.first_name} ${invoice.patient.last_name}`,
            amount: item.amount.toString(),
            due_date: item.due_date.toISOString().split('T')[0],
            clinic_name: invoice.clinic.name,
            invoice_number: invoice.invoice_number,
          },
          metadata: { automation: 'payment_reminder', installment_id: item.id, invoice_id: invoice.id },
        });
      } catch (e) {
        this.logger.warn(`Payment reminder failed: ${(e as Error).message}`);
      }
    }
  }

  // ─── Dormant Patient Detection — Weekly on Monday at 6 AM ───

  @Cron('0 0 6 * * 1')
  async dormantPatientDetection(): Promise<void> {
    this.logger.log('Running dormant patient detection...');

    const clinics = await this.getActiveClinics();

    for (const clinic of clinics) {
      try {
        const rule = await this.automationService.getRuleConfig(clinic.id, 'dormant_reactivation');
        if (!rule?.is_enabled) continue;

        const config = (rule.config as Record<string, unknown>) || {};
        const dormancyMonths = (config.dormancy_months as number) || 6;
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - dormancyMonths);

        const dormantPatients = await this.prisma.patient.findMany({
          where: {
            clinic_id: clinic.id,
            appointments: { none: { appointment_date: { gte: cutoff } } },
          },
          select: { id: true, first_name: true, last_name: true, phone: true, email: true },
        });

        for (const patient of dormantPatients) {
          try {
            const channel = await this.resolveChannel(clinic.id, patient.id, rule.channel);
            await this.communicationService.sendMessage(clinic.id, {
              patient_id: patient.id,
              channel,
              category: MessageCategory.PROMOTIONAL,
              template_id: rule.template_id ?? undefined,
              body: rule.template_id
                ? undefined
                : `Hi ${patient.first_name}, it's been a while since your last visit to ${clinic.name}. Your dental health matters! Book your check-up today.`,
              variables: {
                patient_name: `${patient.first_name} ${patient.last_name}`,
                patient_first_name: patient.first_name,
                clinic_name: clinic.name,
              },
              metadata: { automation: 'dormant_reactivation' },
            });
          } catch {
            // Skip individual failures
          }
        }

        if (dormantPatients.length > 0) {
          this.logger.log(`Sent reactivation messages to ${dormantPatients.length} dormant patients for ${clinic.name}`);
        }
      } catch (e) {
        this.logger.error(`Dormant detection error for clinic ${clinic.id}: ${(e as Error).message}`);
      }
    }
  }

  // ─── Treatment Plan Completion Reminders — Daily at 10 AM ───

  @Cron('0 0 10 * * *')
  async treatmentPlanReminders(): Promise<void> {
    this.logger.log('Running treatment plan reminder automation...');

    const clinics = await this.getActiveClinics();

    for (const clinic of clinics) {
      try {
        const rule = await this.automationService.getRuleConfig(clinic.id, 'treatment_plan_reminder');
        if (!rule?.is_enabled) continue;

        const config = (rule.config as Record<string, unknown>) || {};
        const intervalDays = (config.reminder_interval_days as number) || 14;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - intervalDays);

        // Patients with incomplete treatments and no recent appointments
        const patients = await this.prisma.patient.findMany({
          where: {
            clinic_id: clinic.id,
            treatments: {
              some: { status: { in: ['planned', 'in_progress'] } },
            },
            appointments: {
              none: { appointment_date: { gte: cutoff } },
            },
          },
          select: { id: true, first_name: true, last_name: true, phone: true, email: true },
        });

        for (const patient of patients) {
          try {
            const channel = await this.resolveChannel(clinic.id, patient.id, rule.channel);
            await this.communicationService.sendMessage(clinic.id, {
              patient_id: patient.id,
              channel,
              category: MessageCategory.TRANSACTIONAL,
              template_id: rule.template_id ?? undefined,
              body: rule.template_id
                ? undefined
                : `Hi ${patient.first_name}, you have an incomplete treatment plan at ${clinic.name}. Please book your next visit to continue your care.`,
              variables: {
                patient_name: `${patient.first_name} ${patient.last_name}`,
                patient_first_name: patient.first_name,
                clinic_name: clinic.name,
              },
              metadata: { automation: 'treatment_plan_reminder' },
            });
          } catch {
            // Skip individual failures
          }
        }
      } catch (e) {
        this.logger.error(`Treatment plan reminder error for clinic ${clinic.id}: ${(e as Error).message}`);
      }
    }
  }

  // ─── Helpers ───

  private async getActiveClinics() {
    return this.prisma.clinic.findMany({
      where: { subscription_status: { in: ['active', 'trial'] } },
      select: { id: true, name: true },
    });
  }

  /** Resolve the channel to use — 'preferred' means check patient preferences */
  private async resolveChannel(clinicId: string, patientId: string, ruleChannel: string): Promise<MessageChannel> {
    if (ruleChannel !== 'preferred') {
      return this.toMessageChannel(ruleChannel);
    }

    const prefs = await this.prisma.patientCommunicationPreference.findUnique({
      where: { patient_id: patientId },
      select: { preferred_channel: true },
    });

    // Check clinic settings to ensure channel is enabled
    const settings = await this.prisma.clinicCommunicationSettings.findUnique({
      where: { clinic_id: clinicId },
    });

    const preferred = prefs?.preferred_channel || 'whatsapp';

    if (settings) {
      if (preferred === 'whatsapp' && settings.enable_whatsapp) return MessageChannel.WHATSAPP;
      if (preferred === 'sms' && settings.enable_sms) return MessageChannel.SMS;
      if (preferred === 'email' && settings.enable_email) return MessageChannel.EMAIL;

      // Fallback: use first enabled channel
      if (settings.enable_whatsapp) return MessageChannel.WHATSAPP;
      if (settings.enable_sms) return MessageChannel.SMS;
      if (settings.enable_email) return MessageChannel.EMAIL;
    }

    return this.toMessageChannel(preferred);
  }

  private toMessageChannel(value: string): MessageChannel {
    const map: Record<string, MessageChannel> = {
      email: MessageChannel.EMAIL,
      sms: MessageChannel.SMS,
      whatsapp: MessageChannel.WHATSAPP,
    };
    return map[value] || MessageChannel.WHATSAPP;
  }
}
