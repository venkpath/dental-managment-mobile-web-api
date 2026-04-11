import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { MessageChannel, MessageCategory } from '../communication/dto/send-message.dto.js';
import { AutomationService } from './automation.service.js';
import { ClinicEventsService } from '../clinic-events/clinic-events.service.js';

@Injectable()
export class AutomationCronService {
  private readonly logger = new Logger(AutomationCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationService: CommunicationService,
    private readonly automationService: AutomationService,
    private readonly clinicEventsService: ClinicEventsService,
  ) {}

  // ─── New Year Festival Calendar Refresh — Jan 1 at 1 AM ───

  @Cron('0 0 1 1 1 *') // 01:00:00 on January 1st every year
  async refreshFestivalCalendar(): Promise<void> {
    const year = new Date().getFullYear();
    this.logger.log(`[New Year] Refreshing system festival dates for ${year}...`);
    try {
      await this.clinicEventsService.refreshSystemFestivalDatesForYear(year);
      this.logger.log(`[New Year] Festival calendar updated for ${year}.`);
    } catch (e) {
      this.logger.error(`[New Year] Festival calendar refresh failed: ${(e as Error).message}`, (e as Error).stack);
    }
  }

  // ─── Birthday Greetings — Daily at 8:30 AM ───

  @Cron('0 30 8 * * *')
  async birthdayGreetings(): Promise<void> {
    this.logger.log('Running birthday greeting automation...');
    let totalSent = 0;

    try {
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
                body: rule.template_id ? undefined : `Happy Birthday, ${patient.first_name}! Wishing you a wonderful day from ${clinic.name}.`,
                variables: {
                  // named keys
                  patient_name: `${patient.first_name} ${patient.last_name}`,
                  patient_first_name: patient.first_name,
                  clinic_name: clinic.name,
                  // numbered keys — {{1}} patient {{2}} clinic
                  '1': patient.first_name,
                  '2': clinic.name,
                },
                metadata: { automation: 'birthday_greeting' },
              });
              totalSent++;
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
    } catch (e) {
      this.logger.error(`Birthday greeting cron failed: ${(e as Error).message}`, (e as Error).stack);
    }

    this.logger.log(`Birthday greeting automation completed. Total sent: ${totalSent}`);
  }

  // ─── Festival Greetings — Daily at 8 AM ───

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async festivalGreetings(): Promise<void> {
    this.logger.log('Running festival greeting automation...');
    let totalSent = 0;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const month = today.getMonth() + 1;
      const day = today.getDate();

      // Recurring events: match by month+day (year-independent)
      const recurringIds = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM clinic_events
        WHERE is_enabled = true
          AND is_recurring = true
          AND EXTRACT(MONTH FROM event_date) = ${month}
          AND EXTRACT(DAY FROM event_date) = ${day}
      `;

      // Find events happening today — recurring by month+day, non-recurring by exact date
      const events = await this.prisma.clinicEvent.findMany({
        where: {
          is_enabled: true,
          OR: [
            { is_recurring: false, event_date: { gte: today, lt: tomorrow } },
            { id: { in: recurringIds.map((r) => r.id) } },
          ],
        },
        include: { template: true },
      });

      if (events.length === 0) {
        this.logger.log('Festival greeting automation completed. No events today.');
        return;
      }

      for (const event of events) {
        try {
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
              select: { name: true, phone: true },
            });

            for (const patient of patients) {
              try {
                const channel = await this.resolveChannel(clinicId, patient.id, rule.channel);
                const effectiveTemplateId = event.template_id ?? rule.template_id ?? undefined;
                // Determine template type from the per-event template name
                const tmplName = event.template?.template_name ?? '';
                const occasionLabel = event.occasion_message ?? '';
                const clinicName = clinic?.name || '';
                const patientFirst = patient.first_name;

                let variables: Record<string, string>;
                let fallbackBody: string;

                if (occasionLabel && tmplName === 'dental_health_awareness') {
                  // dental_health_awareness — {{1}} patient {{2}} health_day {{3}} clinic
                  variables = {
                    patient_first_name: patientFirst,
                    health_day: occasionLabel,
                    clinic_name: clinicName,
                    '1': patientFirst,
                    '2': occasionLabel,
                    '3': clinicName,
                  };
                  fallbackBody = `Hi ${patientFirst}, on this ${occasionLabel}, ${clinicName} reminds you that your oral health is our priority. Book your dental checkup today!`;
                } else if (occasionLabel && tmplName === 'dental_national_day_greeting') {
                  // dental_national_day_greeting — {{1}} patient {{2}} clinic {{3}} occasion
                  variables = {
                    patient_first_name: patientFirst,
                    clinic_name: clinicName,
                    occasion: occasionLabel,
                    '1': patientFirst,
                    '2': clinicName,
                    '3': occasionLabel,
                  };
                  fallbackBody = `Hi ${patientFirst}, the team at ${clinicName} wishes you a very Happy ${occasionLabel}! May this special occasion bring joy and good health to you and your loved ones.`;
                } else {
                  // dental_festival_greeting (default) — {{1}} patient {{2}} festival {{3}} clinic
                  variables = {
                    patient_first_name: patientFirst,
                    clinic_name: clinicName,
                    festival_name: event.event_name,
                    phone: clinic?.phone || '',
                    '1': patientFirst,
                    '2': event.event_name,
                    '3': clinicName,
                  };
                  fallbackBody = `Wishing you a Happy ${event.event_name}! From ${clinicName}.`;
                }

                await this.communicationService.sendMessage(clinicId, {
                  patient_id: patient.id,
                  channel,
                  category: MessageCategory.PROMOTIONAL,
                  template_id: effectiveTemplateId,
                  body: effectiveTemplateId ? undefined : fallbackBody,
                  variables,
                  metadata: { automation: 'festival_greeting', event_id: event.id },
                });
                totalSent++;
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
    } catch (e) {
      this.logger.error(`Festival greeting cron failed: ${(e as Error).message}`, (e as Error).stack);
    }

    this.logger.log(`Festival greeting automation completed. Total sent: ${totalSent}`);
  }

  // ─── Appointment Reminders to Patients — Daily at 7:30 AM ───

  @Cron('0 30 7 * * *')
  async appointmentRemindersToPatients(): Promise<void> {
    this.logger.log('Running patient appointment reminder automation...');
    let sent = 0;
    let skipped = 0;
    let failed = 0;

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
        include: {
          patient: true,
          dentist: { select: { name: true } },
          clinic: { select: { id: true, name: true, phone: true } },
          branch: { select: { name: true, address: true } },
        },
      });

      this.logger.log(`Found ${appointments.length} appointments for tomorrow`);

      for (const appt of appointments) {
        try {
          const rule = await this.automationService.getRuleConfig(appt.clinic_id, 'appointment_reminder_patient');
          if (!rule?.is_enabled) {
            skipped++;
            continue;
          }

          const fmtDate = this.formatDate(appt.appointment_date);
          const fmtTime = this.formatTime(appt.start_time);
          const clinicPhone = appt.clinic.phone || '';

          const channel = await this.resolveChannel(appt.clinic_id, appt.patient_id, rule.channel);
          await this.communicationService.sendMessage(appt.clinic_id, {
            patient_id: appt.patient_id,
            channel,
            category: MessageCategory.TRANSACTIONAL,
            template_id: rule.template_id ?? undefined,
            body: rule.template_id
              ? undefined
              : `Reminder: You have an appointment tomorrow at ${fmtTime} with Dr. ${appt.dentist.name} at ${appt.clinic.name}.`,
            variables: {
              // named keys (for DB template.variables mapping)
              patient_name: `${appt.patient.first_name} ${appt.patient.last_name}`,
              patient_first_name: appt.patient.first_name,
              date: fmtDate,
              time: fmtTime,
              dentist_name: appt.dentist.name,
              doctor_name: appt.dentist.name,
              clinic_name: appt.clinic.name,
              phone: clinicPhone,
              // numbered keys — {{1}} patient {{2}} date {{3}} time {{4}} clinic {{5}} doctor {{6}} phone
              '1': appt.patient.first_name,
              '2': fmtDate,
              '3': fmtTime,
              '4': appt.clinic.name,
              '5': appt.dentist.name,
              '6': clinicPhone,
            },
            metadata: { automation: 'appointment_reminder_patient', appointment_id: appt.id },
          });
          sent++;
        } catch (e) {
          failed++;
          this.logger.warn(`Appointment reminder failed for ${appt.patient_id}: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      this.logger.error(`Appointment reminder cron failed: ${(e as Error).message}`, (e as Error).stack);
    }

    this.logger.log(`Appointment reminder automation completed. Sent: ${sent}, Skipped: ${skipped}, Failed: ${failed}`);
  }

  // ─── Payment Reminders (3 days before due) — Daily at 9:30 AM ───

  @Cron('0 30 9 * * *')
  async paymentReminders(): Promise<void> {
    this.logger.log('Running payment reminder automation...');
    let sent = 0;
    let failed = 0;

    try {
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
                  clinic: { select: { id: true, name: true, phone: true } },
                },
              },
            },
          },
        },
      });

      this.logger.log(`Found ${upcomingInstallments.length} upcoming installments due in 3 days`);

      for (const item of upcomingInstallments) {
        const invoice = item.plan.invoice;
        try {
          const rule = await this.automationService.getRuleConfig(invoice.clinic_id, 'payment_reminder');
          if (!rule?.is_enabled) continue;

          const fmtAmount = this.formatAmount(item.amount);
          const fmtDueDate = this.formatDate(item.due_date);
          const clinicPhone = invoice.clinic.phone || '';

          const channel = await this.resolveChannel(invoice.clinic_id, invoice.patient_id, rule.channel);
          await this.communicationService.sendMessage(invoice.clinic_id, {
            patient_id: invoice.patient_id,
            channel,
            category: MessageCategory.TRANSACTIONAL,
            template_id: rule.template_id ?? undefined,
            body: rule.template_id
              ? undefined
              : `Reminder: Your installment of ${fmtAmount} is due on ${fmtDueDate}. Please visit ${invoice.clinic.name} or contact us.`,
            variables: {
              // named keys
              patient_name: `${invoice.patient.first_name} ${invoice.patient.last_name}`,
              patient_first_name: invoice.patient.first_name,
              amount: fmtAmount,
              due_date: fmtDueDate,
              clinic_name: invoice.clinic.name,
              invoice_number: invoice.invoice_number,
              phone: clinicPhone,
              // numbered keys — {{1}} patient {{2}} amount {{3}} due_date {{4}} clinic {{5}} phone
              '1': invoice.patient.first_name,
              '2': fmtAmount,
              '3': fmtDueDate,
              '4': invoice.clinic.name,
              '5': clinicPhone,
            },
            metadata: { automation: 'payment_reminder', installment_id: item.id, invoice_id: invoice.id },
          });
          sent++;
        } catch (e) {
          failed++;
          this.logger.warn(`Payment reminder failed: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      this.logger.error(`Payment reminder cron failed: ${(e as Error).message}`, (e as Error).stack);
    }

    this.logger.log(`Payment reminder automation completed. Sent: ${sent}, Failed: ${failed}`);
  }

  // ─── Dormant Patient Detection — Weekly on Monday at 6 AM ───

  @Cron('0 0 6 * * 1')
  async dormantPatientDetection(): Promise<void> {
    this.logger.log('Running dormant patient detection...');
    let totalSent = 0;

    try {
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
                  // named keys
                  patient_name: `${patient.first_name} ${patient.last_name}`,
                  patient_first_name: patient.first_name,
                  clinic_name: clinic.name,
                  phone: clinic.phone || '',
                  // numbered keys — {{1}} patient {{2}} clinic {{3}} phone
                  '1': patient.first_name,
                  '2': clinic.name,
                  '3': clinic.phone || '',
                },
                metadata: { automation: 'dormant_reactivation' },
              });
              totalSent++;
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
    } catch (e) {
      this.logger.error(`Dormant patient cron failed: ${(e as Error).message}`, (e as Error).stack);
    }

    this.logger.log(`Dormant patient detection completed. Total sent: ${totalSent}`);
  }

  // ─── Treatment Plan Completion Reminders — Daily at 10 AM ───

  @Cron('0 0 10 * * *')
  async treatmentPlanReminders(): Promise<void> {
    this.logger.log('Running treatment plan reminder automation...');
    let totalSent = 0;

    try {
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
                  // named keys
                  patient_name: `${patient.first_name} ${patient.last_name}`,
                  patient_first_name: patient.first_name,
                  clinic_name: clinic.name,
                  // numbered keys — {{1}} patient {{2}} clinic
                  '1': patient.first_name,
                  '2': clinic.name,
                },
                metadata: { automation: 'treatment_plan_reminder' },
              });
              totalSent++;
            } catch {
              // Skip individual failures
            }
          }
        } catch (e) {
          this.logger.error(`Treatment plan reminder error for clinic ${clinic.id}: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      this.logger.error(`Treatment plan reminder cron failed: ${(e as Error).message}`, (e as Error).stack);
    }

    this.logger.log(`Treatment plan reminder automation completed. Total sent: ${totalSent}`);
  }

  // ─── No-Show Follow-Up — Daily at 10:30 AM ───

  @Cron('0 30 10 * * *')
  async noShowFollowUp(): Promise<void> {
    this.logger.log('Running no-show follow-up automation...');
    let totalSent = 0;

    try {
      const clinics = await this.getActiveClinics();

      for (const clinic of clinics) {
        try {
          const rule = await this.automationService.getRuleConfig(clinic.id, 'no_show_followup');
          if (!rule?.is_enabled) continue;

          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          yesterday.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const noShowAppts = await this.prisma.appointment.findMany({
            where: {
              clinic_id: clinic.id,
              status: 'no_show',
              appointment_date: { gte: yesterday, lt: today },
            },
            include: {
              patient: true,
              dentist: { select: { name: true } },
            },
          });

          for (const appt of noShowAppts) {
            try {
              const channel = await this.resolveChannel(clinic.id, appt.patient_id, rule.channel);
              await this.communicationService.sendMessage(clinic.id, {
                patient_id: appt.patient_id,
                channel,
                category: MessageCategory.TRANSACTIONAL,
                template_id: rule.template_id ?? undefined,
                body: rule.template_id
                  ? undefined
                  : `Hi ${appt.patient.first_name}, we missed you at your appointment yesterday at ${clinic.name}. Please call us to reschedule at your convenience.`,
                variables: {
                  // named keys
                  patient_name: `${appt.patient.first_name} ${appt.patient.last_name}`,
                  patient_first_name: appt.patient.first_name,
                  clinic_name: clinic.name,
                  phone: clinic.phone || '',
                  // numbered keys — {{1}} patient {{2}} clinic {{3}} phone
                  '1': appt.patient.first_name,
                  '2': clinic.name,
                  '3': clinic.phone || '',
                },
                metadata: { automation: 'no_show_followup', appointment_id: appt.id },
              });
              totalSent++;
            } catch {
              // Skip individual failures
            }
          }
        } catch (e) {
          this.logger.error(`No-show follow-up error for clinic ${clinic.id}: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      this.logger.error(`No-show follow-up cron failed: ${(e as Error).message}`, (e as Error).stack);
    }

    this.logger.log(`No-show follow-up automation completed. Total sent: ${totalSent}`);
  }

  // ─── Post-Treatment Care Instructions — Daily at 6 PM ───

  @Cron('0 0 18 * * *')
  async postTreatmentCare(): Promise<void> {
    this.logger.log('Running post-treatment care automation...');
    let totalSent = 0;

    try {
      const clinics = await this.getActiveClinics();

      for (const clinic of clinics) {
        try {
          const rule = await this.automationService.getRuleConfig(clinic.id, 'post_treatment_care');
          if (!rule?.is_enabled) continue;

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          const completedTreatments = await this.prisma.treatment.findMany({
            where: {
              clinic_id: clinic.id,
              status: 'completed',
              updated_at: { gte: today, lt: tomorrow },
            },
            include: {
              patient: true,
              dentist: { select: { name: true } },
            },
          });

          for (const treatment of completedTreatments) {
            try {
              const channel = await this.resolveChannel(clinic.id, treatment.patient_id, rule.channel);
              await this.communicationService.sendMessage(clinic.id, {
                patient_id: treatment.patient_id,
                channel,
                category: MessageCategory.TRANSACTIONAL,
                template_id: rule.template_id ?? undefined,
                body: rule.template_id
                  ? undefined
                  : `Hi ${treatment.patient.first_name}, thank you for visiting ${clinic.name} today for your ${treatment.procedure}. Please follow your dentist's care instructions. Contact us if you have any concerns.`,
                variables: {
                  // named keys
                  patient_name: `${treatment.patient.first_name} ${treatment.patient.last_name}`,
                  patient_first_name: treatment.patient.first_name,
                  procedure: treatment.procedure,
                  dentist_name: treatment.dentist.name,
                  doctor_name: treatment.dentist.name,
                  clinic_name: clinic.name,
                  phone: clinic.phone || '',
                  // numbered keys — {{1}} patient {{2}} procedure {{3}} clinic {{4}} dentist {{5}} phone
                  '1': treatment.patient.first_name,
                  '2': treatment.procedure,
                  '3': clinic.name,
                  '4': treatment.dentist.name,
                  '5': clinic.phone || '',
                },
                metadata: { automation: 'post_treatment_care', treatment_id: treatment.id },
              });
              totalSent++;
            } catch {
              // Skip individual failures
            }
          }
        } catch (e) {
          this.logger.error(`Post-treatment care error for clinic ${clinic.id}: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      this.logger.error(`Post-treatment care cron failed: ${(e as Error).message}`, (e as Error).stack);
    }

    this.logger.log(`Post-treatment care automation completed. Total sent: ${totalSent}`);
  }

  // ─── Feedback Collection — Daily at 7 PM ───

  @Cron('0 0 19 * * *')
  async feedbackCollection(): Promise<void> {
    this.logger.log('Running feedback collection automation...');
    let totalSent = 0;

    try {
      const clinics = await this.getActiveClinics();

      for (const clinic of clinics) {
        try {
          const rule = await this.automationService.getRuleConfig(clinic.id, 'feedback_collection');
          if (!rule?.is_enabled) continue;

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);

          // Find yesterday's completed appointments that have no feedback yet
          const completedAppts = await this.prisma.appointment.findMany({
            where: {
              clinic_id: clinic.id,
              status: 'completed',
              appointment_date: { gte: yesterday, lt: today },
            },
            include: { patient: true },
          });

          for (const appt of completedAppts) {
            try {
              // Check if feedback already submitted for this appointment
              const existingFeedback = await this.prisma.patientFeedback.findFirst({
                where: { appointment_id: appt.id },
              });
              if (existingFeedback) continue;

              const channel = await this.resolveChannel(clinic.id, appt.patient_id, rule.channel);
              await this.communicationService.sendMessage(clinic.id, {
                patient_id: appt.patient_id,
                channel,
                category: MessageCategory.TRANSACTIONAL,
                template_id: rule.template_id ?? undefined,
                body: rule.template_id
                  ? undefined
                  : `Hi ${appt.patient.first_name}, thank you for visiting ${clinic.name}! We'd love your feedback on your recent visit. Please rate your experience — it helps us serve you better.`,
                variables: {
                  // named keys
                  patient_name: `${appt.patient.first_name} ${appt.patient.last_name}`,
                  patient_first_name: appt.patient.first_name,
                  clinic_name: clinic.name,
                  // numbered keys — {{1}} patient {{2}} clinic
                  '1': appt.patient.first_name,
                  '2': clinic.name,
                },
                metadata: { automation: 'feedback_collection', appointment_id: appt.id },
              });
              totalSent++;
            } catch {
              // Skip individual failures
            }
          }
        } catch (e) {
          this.logger.error(`Feedback collection error for clinic ${clinic.id}: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      this.logger.error(`Feedback collection cron failed: ${(e as Error).message}`, (e as Error).stack);
    }

    this.logger.log(`Feedback collection automation completed. Total sent: ${totalSent}`);
  }

  // ─── Overdue Payment Notification to Patients — Daily at 11 AM ───

  @Cron('0 0 11 * * *')
  async overduePaymentNotification(): Promise<void> {
    this.logger.log('Running overdue payment notification to patients...');
    let totalSent = 0;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const overdueInstallments = await this.prisma.installmentItem.findMany({
        where: {
          due_date: { lt: today },
          status: 'pending',
        },
        include: {
          plan: {
            include: {
              invoice: {
                include: {
                  patient: true,
                  clinic: { select: { id: true, name: true, phone: true, subscription_status: true } },
                },
              },
            },
          },
        },
      });

      for (const item of overdueInstallments) {
        const invoice = item.plan.invoice;
        if (!['active', 'trial'].includes(invoice.clinic.subscription_status)) continue;

        try {
          const rule = await this.automationService.getRuleConfig(invoice.clinic_id, 'payment_overdue');
          if (!rule?.is_enabled) continue;

          const fmtAmountOverdue = this.formatAmount(item.amount);
          const fmtDueDateOverdue = this.formatDate(item.due_date);
          const overdueClinicPhone = invoice.clinic.phone || '';

          const channel = await this.resolveChannel(invoice.clinic_id, invoice.patient_id, rule.channel);
          await this.communicationService.sendMessage(invoice.clinic_id, {
            patient_id: invoice.patient_id,
            channel,
            category: MessageCategory.TRANSACTIONAL,
            template_id: rule.template_id ?? undefined,
            body: rule.template_id
              ? undefined
              : `Hi ${invoice.patient.first_name}, your payment of ${fmtAmountOverdue} for invoice ${invoice.invoice_number} was due on ${fmtDueDateOverdue}. Please make the payment at your earliest convenience. Contact ${invoice.clinic.name} at ${overdueClinicPhone} for any queries.`,
            variables: {
              // named keys
              patient_name: `${invoice.patient.first_name} ${invoice.patient.last_name}`,
              patient_first_name: invoice.patient.first_name,
              amount: fmtAmountOverdue,
              due_date: fmtDueDateOverdue,
              clinic_name: invoice.clinic.name,
              invoice_number: invoice.invoice_number,
              phone: overdueClinicPhone,
              // numbered keys — {{1}} patient {{2}} amount {{3}} due_date {{4}} clinic {{5}} phone
              '1': invoice.patient.first_name,
              '2': fmtAmountOverdue,
              '3': fmtDueDateOverdue,
              '4': invoice.clinic.name,
              '5': overdueClinicPhone,
            },
            metadata: { automation: 'payment_overdue', installment_id: item.id, invoice_id: invoice.id },
          });
          totalSent++;
        } catch (e) {
          this.logger.warn(`Overdue payment notification failed: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      this.logger.error(`Overdue payment notification cron failed: ${(e as Error).message}`, (e as Error).stack);
    }

    this.logger.log(`Overdue payment notification completed. Total sent: ${totalSent}`);
  }

  // ─── Google Review Solicitation — Daily at 8 PM ───

  @Cron('0 0 20 * * *')
  async googleReviewSolicitation(): Promise<void> {
    this.logger.log('Running Google review solicitation...');
    let totalSent = 0;

    try {
      const clinics = await this.getActiveClinics();

      for (const clinic of clinics) {
        try {
          const rule = await this.automationService.getRuleConfig(clinic.id, 'feedback_collection');
          if (!rule?.is_enabled) continue;

          const config = (rule.config as Record<string, unknown>) || {};
          const minRating = (config.min_rating_for_google_review as number) || 4;

          const settings = await this.prisma.clinicCommunicationSettings.findUnique({
            where: { clinic_id: clinic.id },
          });
          if (!settings?.google_review_url) continue;

          // Find recent positive feedback not yet prompted for review
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          yesterday.setHours(0, 0, 0, 0);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const positiveFeedback = await this.prisma.patientFeedback.findMany({
            where: {
              clinic_id: clinic.id,
              rating: { gte: minRating },
              google_review_requested: false,
              created_at: { gte: yesterday, lt: today },
            },
            include: { patient: true },
          });

          for (const feedback of positiveFeedback) {
            try {
              const channel = await this.resolveChannel(clinic.id, feedback.patient_id, rule.channel);
              await this.communicationService.sendMessage(clinic.id, {
                patient_id: feedback.patient_id,
                channel,
                category: MessageCategory.PROMOTIONAL,
                body: `Hi ${feedback.patient.first_name}, thank you for the wonderful feedback! We'd appreciate it if you could share your experience on Google: ${settings.google_review_url}`,
                variables: {
                  patient_name: `${feedback.patient.first_name} ${feedback.patient.last_name}`,
                  patient_first_name: feedback.patient.first_name,
                  clinic_name: clinic.name,
                  google_review_url: settings.google_review_url,
                },
                metadata: { automation: 'google_review_solicitation', feedback_id: feedback.id },
              });

              await this.prisma.patientFeedback.update({
                where: { id: feedback.id },
                data: { google_review_requested: true },
              });
              totalSent++;
            } catch {
              // Skip individual failures
            }
          }
        } catch (e) {
          this.logger.error(`Google review solicitation error for clinic ${clinic.id}: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      this.logger.error(`Google review solicitation cron failed: ${(e as Error).message}`, (e as Error).stack);
    }

    this.logger.log(`Google review solicitation completed. Total sent: ${totalSent}`);
  }

  // ─── Patient Anniversary Greeting — Daily at 9 AM ───

  @Cron('0 0 9 * * *')
  async patientAnniversaryGreeting(): Promise<void> {
    this.logger.log('Running patient anniversary greeting automation...');
    let totalSent = 0;

    try {
      const clinics = await this.getActiveClinics();

      for (const clinic of clinics) {
        try {
          const rule = await this.automationService.getRuleConfig(clinic.id, 'anniversary_greeting');
          if (!rule?.is_enabled) continue;

          const today = new Date();
          const month = today.getMonth() + 1;
          const day = today.getDate();

          // Find patients whose registration anniversary is today (exclude patients created this year)
          const anniversaryPatients = await this.prisma.$queryRaw<
            { id: string; first_name: string; last_name: string; phone: string; email: string | null; years: number }[]
          >`
            SELECT id, first_name, last_name, phone, email,
              EXTRACT(YEAR FROM AGE(NOW(), created_at))::int AS years
            FROM patients
            WHERE clinic_id = ${clinic.id}::uuid
              AND EXTRACT(MONTH FROM created_at) = ${month}
              AND EXTRACT(DAY FROM created_at) = ${day}
              AND created_at < NOW() - INTERVAL '1 year'
          `;

          for (const patient of anniversaryPatients) {
            try {
              const channel = await this.resolveChannel(clinic.id, patient.id, rule.channel);
              await this.communicationService.sendMessage(clinic.id, {
                patient_id: patient.id,
                channel,
                category: MessageCategory.PROMOTIONAL,
                template_id: rule.template_id ?? undefined,
                body: rule.template_id
                  ? undefined
                  : `Happy ${patient.years}-year anniversary with ${clinic.name}, ${patient.first_name}! 🎉 Thank you for trusting us with your dental care. We look forward to many more years of keeping your smile bright!`,
                variables: {
                  patient_name: `${patient.first_name} ${patient.last_name}`,
                  patient_first_name: patient.first_name,
                  clinic_name: clinic.name,
                  anniversary_years: String(patient.years),
                },
                metadata: { automation: 'anniversary_greeting' },
              });
              totalSent++;
            } catch (e) {
              this.logger.warn(`Anniversary greeting failed for patient ${patient.id}: ${(e as Error).message}`);
            }
          }

          if (anniversaryPatients.length > 0) {
            this.logger.log(`Sent ${anniversaryPatients.length} anniversary greetings for clinic ${clinic.name}`);
          }
        } catch (e) {
          this.logger.error(`Anniversary greeting error for clinic ${clinic.id}: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      this.logger.error(`Anniversary greeting cron failed: ${(e as Error).message}`, (e as Error).stack);
    }

    this.logger.log(`Patient anniversary greeting automation completed. Total sent: ${totalSent}`);
  }

  // ─── Prescription Refill Reminder — Daily at 8 AM ───

  @Cron('0 0 8 * * *')
  async prescriptionRefillReminder(): Promise<void> {
    this.logger.log('Running prescription refill reminder automation...');
    let totalSent = 0;

    try {
      const clinics = await this.getActiveClinics();

      for (const clinic of clinics) {
        try {
          const rule = await this.automationService.getRuleConfig(clinic.id, 'prescription_refill');
          if (!rule?.is_enabled) continue;

          const config = (rule.config as Record<string, unknown>) || {};
          const advanceDays = (config.advance_days as number) || 2;

          // Calculate the target end date (prescriptions ending in `advanceDays` days)
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() + advanceDays);
          targetDate.setHours(0, 0, 0, 0);
          const targetDateEnd = new Date(targetDate);
          targetDateEnd.setDate(targetDateEnd.getDate() + 1);

          // Find prescriptions with items ending around the target date.
          // Duration is stored as a string like "7 days", "2 weeks", "1 month".
          // We compute: created_at + parsed_duration ≈ targetDate.
          const prescriptions = await this.prisma.prescription.findMany({
            where: { clinic_id: clinic.id },
            include: {
              patient: { select: { id: true, first_name: true, last_name: true, phone: true, email: true } },
              items: true,
            },
            // Only check prescriptions created within the last 90 days
            orderBy: { created_at: 'desc' },
          });

          for (const rx of prescriptions) {
            // Check if any item ends around the target date
            const createdAt = new Date(rx.created_at);
            const daysSinceCreation = Math.floor((targetDate.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

            // Skip prescriptions older than 90 days
            if (daysSinceCreation > 90 || daysSinceCreation < 0) continue;

            const expiringItems = rx.items.filter((item) => {
              const durationDays = this.parseDurationToDays(item.duration);
              if (!durationDays) return false;
              // Check if the medication ends within the advance window
              const endDay = durationDays;
              return daysSinceCreation >= endDay - advanceDays && daysSinceCreation <= endDay;
            });

            if (expiringItems.length === 0) continue;

            const medicineNames = expiringItems.map((i) => i.medicine_name).join(', ');

            try {
              const channel = await this.resolveChannel(clinic.id, rx.patient.id, rule.channel);
              await this.communicationService.sendMessage(clinic.id, {
                patient_id: rx.patient.id,
                channel,
                category: MessageCategory.TRANSACTIONAL,
                template_id: rule.template_id ?? undefined,
                body: rule.template_id
                  ? undefined
                  : `Hi ${rx.patient.first_name}, your prescription for ${medicineNames} is about to run out. Please contact ${clinic.name} if you need a refill or follow-up appointment.`,
                variables: {
                  patient_name: `${rx.patient.first_name} ${rx.patient.last_name}`,
                  patient_first_name: rx.patient.first_name,
                  clinic_name: clinic.name,
                  medicine_names: medicineNames,
                },
                metadata: { automation: 'prescription_refill', prescription_id: rx.id },
              });
              totalSent++;
            } catch (e) {
              this.logger.warn(`Prescription refill reminder failed for patient ${rx.patient.id}: ${(e as Error).message}`);
            }
          }
        } catch (e) {
          this.logger.error(`Prescription refill error for clinic ${clinic.id}: ${(e as Error).message}`);
        }
      }
    } catch (e) {
      this.logger.error(`Prescription refill cron failed: ${(e as Error).message}`, (e as Error).stack);
    }

    this.logger.log(`Prescription refill reminder automation completed. Total sent: ${totalSent}`);
  }

  // ─── Helpers ───

  private async getActiveClinics() {
    return this.prisma.clinic.findMany({
      where: { subscription_status: { in: ['active', 'trial'] } },
      select: { id: true, name: true, phone: true },
    });
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  }

  private formatTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    return `${h}:${String(minutes).padStart(2, '0')} ${period}`;
  }

  private formatAmount(amount: unknown): string {
    const num = typeof amount === 'number' ? amount : Number(amount);
    return `Rs.${num.toLocaleString('en-IN')}`;
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

  /** Parse duration string like "7 days", "2 weeks", "1 month" to number of days */
  private parseDurationToDays(duration: string): number | null {
    const match = duration.toLowerCase().match(/^(\d+)\s*(day|days|week|weeks|month|months)$/);
    if (!match) return null;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    if (unit.startsWith('day')) return value;
    if (unit.startsWith('week')) return value * 7;
    if (unit.startsWith('month')) return value * 30;
    return null;
  }
}
