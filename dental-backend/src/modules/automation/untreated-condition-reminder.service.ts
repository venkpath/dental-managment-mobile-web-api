import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { MessageCategory, MessageChannel } from '../communication/dto/send-message.dto.js';
import { AiService } from '../ai/ai.service.js';
import { AutomationService } from './automation.service.js';
import {
  parseReminderDelayMinutes,
  parseUntreatedConditionConfig,
} from './untreated-condition-reminder.config.js';
import { getBookingUrl } from '../../common/utils/booking-url.util.js';

export interface UntreatedConditionFinding {
  condition: string;
  fdi: number;
  createdAt: Date;
}

export interface PatientUntreatedSnapshot {
  patientId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  branchId: string | null;
  findings: UntreatedConditionFinding[];
  anchorAt: Date;
}

/** Map raw condition codes to patient-friendly labels (no tooth numbers). */
const CONDITION_PATIENT_LABELS: Record<string, string> = {
  cavity: 'areas of tooth decay',
  caries: 'areas of tooth decay',
  decay: 'tooth decay',
  fracture: 'a chipped or cracked tooth',
  cracked: 'a cracked tooth',
  missing: 'a missing tooth gap',
  abscess: 'a dental infection',
  infection: 'a dental infection',
  gingivitis: 'gum inflammation',
  periodontitis: 'gum disease',
  calculus: 'plaque and tartar buildup',
  erosion: 'enamel wear',
  sensitivity: 'tooth sensitivity',
  rct: 'an untreated root canal need',
  root_canal: 'an untreated root canal need',
  crown_needed: 'a tooth needing protection',
  implant_needed: 'a gap needing restoration',
};

function humanizeCondition(raw: string): string {
  const key = raw.toLowerCase().replace(/\s+/g, '_');
  return CONDITION_PATIENT_LABELS[key] ?? raw.replace(/_/g, ' ').toLowerCase();
}

function uniquePatientLabels(findings: UntreatedConditionFinding[]): string[] {
  const labels = findings.map((f) => humanizeCondition(f.condition));
  return [...new Set(labels)];
}

function anchorDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Parse FDI numbers from a treatment tooth_number (supports "35,36,37"). */
export function parseToothFdiNumbers(raw: string | null | undefined): number[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));
}

function substituteReminderPlaceholders(
  text: string,
  vars: Record<string, string>,
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? `{{${key}}}`);
}

@Injectable()
export class UntreatedConditionReminderService {
  private readonly logger = new Logger(UntreatedConditionReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationService: CommunicationService,
    private readonly automationService: AutomationService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Patients with charted conditions on teeth where no treatment has started
   * (no in_progress or completed treatment on that tooth).
   */
  async findPatientsWithUntreatedConditions(clinicId: string): Promise<PatientUntreatedSnapshot[]> {
    const [conditions, startedTreatments] = await Promise.all([
      this.prisma.patientToothCondition.findMany({
        where: { clinic_id: clinicId },
        include: { tooth: true, patient: { select: { id: true, first_name: true, last_name: true, phone: true, email: true, branch_id: true } } },
      }),
      this.prisma.treatment.findMany({
        where: {
          clinic_id: clinicId,
          status: { in: ['in_progress', 'completed'] },
          tooth_number: { not: null },
        },
        select: { patient_id: true, tooth_number: true },
      }),
    ]);

    const treatedByPatient = new Map<string, Set<string>>();
    for (const t of startedTreatments) {
      if (!t.tooth_number) continue;
      const set = treatedByPatient.get(t.patient_id) ?? new Set<string>();
      for (const fdi of parseToothFdiNumbers(t.tooth_number)) {
        set.add(String(fdi));
      }
      treatedByPatient.set(t.patient_id, set);
    }

    const byPatient = new Map<string, PatientUntreatedSnapshot>();

    for (const c of conditions) {
      const fdi = c.tooth?.fdi_number;
      if (!fdi || !c.patient) continue;

      const treated = treatedByPatient.get(c.patient_id);
      if (treated?.has(String(fdi))) continue;

      const existing = byPatient.get(c.patient_id);
      const finding: UntreatedConditionFinding = {
        condition: c.condition,
        fdi,
        createdAt: c.created_at,
      };

      if (!existing) {
        byPatient.set(c.patient_id, {
          patientId: c.patient_id,
          firstName: c.patient.first_name,
          lastName: c.patient.last_name,
          phone: c.patient.phone,
          email: c.patient.email,
          branchId: c.patient.branch_id,
          findings: [finding],
          anchorAt: c.created_at,
        });
      } else {
        existing.findings.push(finding);
        if (c.created_at < existing.anchorAt) {
          existing.anchorAt = c.created_at;
        }
      }
    }

    return [...byPatient.values()].filter((p) => p.findings.length > 0);
  }

  async wasReminderSent(
    clinicId: string,
    patientId: string,
    reminderIndex: 1 | 2,
    anchorAt: Date,
  ): Promise<boolean> {
    const anchorKey = anchorDateKey(anchorAt);
    const existing = await this.prisma.communicationMessage.findFirst({
      where: {
        clinic_id: clinicId,
        patient_id: patientId,
        direction: 'outbound',
        created_at: { gte: anchorAt },
        metadata: { path: ['automation'], equals: 'untreated_condition_reminder' },
        AND: [
          { metadata: { path: ['reminder_index'], equals: reminderIndex } },
          { metadata: { path: ['anchor_at'], equals: anchorKey } },
        ],
      },
      select: { id: true },
    });
    return Boolean(existing);
  }

  private isDelayElapsed(anchorAt: Date, delayMinutes: number): boolean {
    const due = new Date(anchorAt.getTime() + delayMinutes * 60 * 1000);
    return new Date() >= due;
  }

  async processClinic(
    clinic: { id: string; name: string; phone: string | null },
    resolveChannel: (clinicId: string, patientId: string, ruleChannel: string) => Promise<MessageChannel>,
  ): Promise<number> {
    const rule = await this.automationService.getRuleConfig(clinic.id, 'untreated_condition_reminder');
    if (!rule?.is_enabled) return 0;

    const config = parseUntreatedConditionConfig((rule.config as Record<string, unknown>) ?? {});
    const patients = await this.findPatientsWithUntreatedConditions(clinic.id);
    let sent = 0;

    for (const snapshot of patients) {
      for (const reminderIndex of [1, 2] as const) {
        const enabled = reminderIndex === 1 ? config.reminder_1_enabled : config.reminder_2_enabled;
        if (!enabled) continue;

        const delayRaw = reminderIndex === 1 ? config.reminder_1_delay : config.reminder_2_delay;
        const delayMinutes = parseReminderDelayMinutes(delayRaw);
        if (!this.isDelayElapsed(snapshot.anchorAt, delayMinutes)) continue;

        if (await this.wasReminderSent(clinic.id, snapshot.patientId, reminderIndex, snapshot.anchorAt)) {
          continue;
        }

        // Reminder 2 only after reminder 1 was sent (when both enabled).
        if (reminderIndex === 2 && config.reminder_1_enabled) {
          const r1Sent = await this.wasReminderSent(clinic.id, snapshot.patientId, 1, snapshot.anchorAt);
          if (!r1Sent) continue;
        }

        try {
          await this.sendReminder(clinic, snapshot, reminderIndex, rule, resolveChannel);
          sent++;
        } catch (e) {
          this.logger.warn(
            `Untreated condition reminder failed for patient ${snapshot.patientId}: ${(e as Error).message}`,
          );
        }
      }
    }

    return sent;
  }

  private async sendReminder(
    clinic: { id: string; name: string; phone: string | null },
    snapshot: PatientUntreatedSnapshot,
    reminderIndex: 1 | 2,
    rule: { channel: string; template_id: string | null },
    resolveChannel: (clinicId: string, patientId: string, ruleChannel: string) => Promise<MessageChannel>,
  ): Promise<void> {
    const conditionLabels = uniquePatientLabels(snapshot.findings);
    const templateId = rule.template_id ?? undefined;

    let concernsSummary = conditionLabels.slice(0, 3).join(', ');
    let urgencyNote =
      'Early care keeps treatment simpler and more comfortable. A short visit can prevent the issue from progressing.';
    let fullMessage = '';

    try {
      const ai = await this.aiService.generateUntreatedConditionReminderMessage(clinic.id, {
        patient_first_name: snapshot.firstName,
        clinic_name: clinic.name,
        conditions: conditionLabels,
        reminder_number: reminderIndex,
      });
      concernsSummary = ai.concerns_summary || concernsSummary;
      urgencyNote = ai.urgency_note || urgencyNote;
      fullMessage = ai.full_message || '';
    } catch (e) {
      this.logger.warn(`AI reminder copy failed, using fallback: ${(e as Error).message}`);
      fullMessage = `Hi ${snapshot.firstName}, during your visit at ${clinic.name} we noted ${concernsSummary}. Early care helps avoid discomfort later. Please call us to schedule a visit.`;
    }

    const phone = clinic.phone || '';
    const bookingUrl = snapshot.branchId
      ? getBookingUrl(clinic.id, snapshot.branchId)
      : '';

    const templateVars: Record<string, string> = {
      patient_name: `${snapshot.firstName} ${snapshot.lastName}`,
      patient_first_name: snapshot.firstName,
      clinic_name: clinic.name,
      concerns_summary: concernsSummary,
      urgency_note: urgencyNote,
      phone,
      booking_url: bookingUrl,
    };

    const resolvedFullMessage = fullMessage
      ? substituteReminderPlaceholders(fullMessage, templateVars)
      : '';

    const body = templateId
      ? undefined
      : resolvedFullMessage ||
        `Hi ${snapshot.firstName}, during your visit at ${clinic.name} we noted: ${concernsSummary}. ${urgencyNote} Please call us at ${phone} to schedule your visit.`;

    const channel = await resolveChannel(clinic.id, snapshot.patientId, rule.channel);

    await this.communicationService.sendMessage(clinic.id, {
      patient_id: snapshot.patientId,
      channel,
      category: MessageCategory.TRANSACTIONAL,
      template_id: templateId,
      body,
      // Meta dental_untreated_condition_reminder: {{1}} first name · {{2}} clinic ·
      // {{3}} concerns · {{4}} urgency · {{5}} phone
      variables: {
        ...templateVars,
        '1': snapshot.firstName,
        '2': clinic.name,
        '3': concernsSummary,
        '4': urgencyNote,
        '5': phone,
      },
      metadata: {
        automation: 'untreated_condition_reminder',
        reminder_index: reminderIndex,
        anchor_at: anchorDateKey(snapshot.anchorAt),
        condition_count: snapshot.findings.length,
      },
    });
  }
}
