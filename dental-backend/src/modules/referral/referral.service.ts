import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service.js';
import { CommunicationService } from '../communication/communication.service.js';
import { MessageChannel, MessageCategory } from '../communication/dto/send-message.dto.js';
import type { CompleteReferralDto } from './dto/index.js';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly communicationService: CommunicationService,
  ) {}

  /** Generate or retrieve a unique referral code for a patient */
  async getOrCreateReferralCode(clinicId: string, patientId: string) {
    const existing = await this.prisma.patientReferralCode.findFirst({
      where: { clinic_id: clinicId, patient_id: patientId, is_active: true },
    });
    if (existing) return existing;

    const code = this.generateCode();
    return this.prisma.patientReferralCode.create({
      data: {
        clinic_id: clinicId,
        patient_id: patientId,
        code,
      },
    });
  }

  /** Deactivate a referral code */
  async deactivateCode(clinicId: string, codeId: string) {
    const code = await this.prisma.patientReferralCode.findFirst({
      where: { id: codeId, clinic_id: clinicId },
    });
    if (!code) throw new NotFoundException('Referral code not found');

    return this.prisma.patientReferralCode.update({
      where: { id: codeId },
      data: { is_active: false },
    });
  }

  /** Record a referral when a new patient uses a code */
  async completeReferral(clinicId: string, dto: CompleteReferralDto) {
    const codeRecord = await this.prisma.patientReferralCode.findUnique({
      where: { clinic_id_code: { clinic_id: clinicId, code: dto.referral_code } },
      include: { patient: true },
    });

    if (!codeRecord || !codeRecord.is_active) {
      throw new NotFoundException('Invalid or inactive referral code');
    }

    // Prevent self-referral
    if (codeRecord.patient_id === dto.referred_patient_id) {
      throw new ConflictException('Cannot use own referral code');
    }

    // Check if already referred
    const existingReferral = await this.prisma.referral.findFirst({
      where: {
        clinic_id: clinicId,
        referred_patient_id: dto.referred_patient_id,
      },
    });
    if (existingReferral) {
      throw new ConflictException('Patient already referred');
    }

    const referral = await this.prisma.referral.create({
      data: {
        clinic_id: clinicId,
        referrer_patient_id: codeRecord.patient_id,
        referred_patient_id: dto.referred_patient_id,
        referral_code_id: codeRecord.id,
        status: 'completed',
        reward_type: 'discount_percentage',
        reward_value: 10, // default 10% discount — admin configurable
        reward_status: 'pending',
      },
      include: {
        referrer: true,
        referred: true,
      },
    });

    // Notify the referrer
    try {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { name: true },
      });

      await this.communicationService.sendMessage(clinicId, {
        patient_id: codeRecord.patient_id,
        channel: MessageChannel.WHATSAPP,
        category: MessageCategory.TRANSACTIONAL,
        body: `Great news, ${codeRecord.patient.first_name}! ${referral.referred?.first_name} joined ${clinic?.name} using your referral code. Your reward is being processed! 🎉`,
        variables: {
          patient_name: `${codeRecord.patient.first_name} ${codeRecord.patient.last_name}`,
          referred_name: `${referral.referred?.first_name || ''} ${referral.referred?.last_name || ''}`,
          clinic_name: clinic?.name || '',
        },
        metadata: { automation: 'referral_notification', referral_id: referral.id },
      });
    } catch (e) {
      this.logger.warn(`Referral notification failed: ${(e as Error).message}`);
    }

    return referral;
  }

  /** Mark reward as credited */
  async creditReward(clinicId: string, referralId: string) {
    const referral = await this.prisma.referral.findFirst({
      where: { id: referralId, clinic_id: clinicId },
    });
    if (!referral) throw new NotFoundException('Referral not found');

    return this.prisma.referral.update({
      where: { id: referralId },
      data: { reward_status: 'credited' },
    });
  }

  /** Get referral stats for a clinic */
  async getStats(clinicId: string) {
    const [total, completed, rewarded, pendingRewards] = await Promise.all([
      this.prisma.referral.count({ where: { clinic_id: clinicId } }),
      this.prisma.referral.count({ where: { clinic_id: clinicId, status: 'completed' } }),
      this.prisma.referral.count({ where: { clinic_id: clinicId, reward_status: 'credited' } }),
      this.prisma.referral.count({ where: { clinic_id: clinicId, reward_status: 'pending' } }),
    ]);

    return { total, completed, rewarded, pending_rewards: pendingRewards };
  }

  /** Get referral leaderboard for a clinic */
  async getLeaderboard(clinicId: string, limit = 10) {
    const leaders = await this.prisma.referral.groupBy({
      by: ['referrer_patient_id'],
      where: { clinic_id: clinicId, status: 'completed' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    const patientIds = leaders.map((l) => l.referrer_patient_id);
    const patients = await this.prisma.patient.findMany({
      where: { id: { in: patientIds } },
      select: { id: true, first_name: true, last_name: true, phone: true },
    });

    const patientMap = new Map(patients.map((p) => [p.id, p]));

    return leaders.map((l) => ({
      patient: patientMap.get(l.referrer_patient_id),
      referral_count: l._count.id,
    }));
  }

  /** Get all referrals for a patient (as referrer) */
  async getPatientReferrals(clinicId: string, patientId: string) {
    return this.prisma.referral.findMany({
      where: { clinic_id: clinicId, referrer_patient_id: patientId },
      include: {
        referred: { select: { id: true, first_name: true, last_name: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  private generateCode(): string {
    return randomBytes(4).toString('hex').toUpperCase().slice(0, 8);
  }
}
