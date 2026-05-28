import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { InsuranceFileService } from './insurance-file.service.js';

const PRE_AUTH_INCLUDE = {
  patient_insurance: {
    include: {
      plan: {
        include: {
          provider: { select: { id: true, name: true, short_code: true, type: true, country: true } },
        },
      },
      patient: { select: { id: true, first_name: true, last_name: true, phone: true } },
    },
  },
  claims: {
    select: { id: true, status: true, claim_number: true, billed_amount: true, created_at: true },
  },
};

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  REQUESTED:    ['SUBMITTED'],
  SUBMITTED:    ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
  UNDER_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED:     ['EXPIRED'],
  REJECTED:     ['SUBMITTED'],
  EXPIRED:      [],
};

export interface CreatePreAuthDto {
  patient_insurance_id: string;
  treatment_plan_id?: string;
  notes?: string;
}

export interface SubmitPreAuthDto {
  submission_method: string;
  submission_ref?: string;
  notes?: string;
}

export interface UpdatePreAuthStatusDto {
  status: string;
  approval_code?: string;
  approved_amount_cap?: number;
  valid_from?: string;
  valid_to?: string;
  notes?: string;
}

@Injectable()
export class InsurancePreAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: InsuranceFileService,
  ) {}

  // ─── List ─────────────────────────────────────────────────────────────────

  async findAll(clinicId: string, filters: {
    status?: string;
    patient_id?: string;
    skip?: number;
    take?: number;
  } = {}) {
    const { status, patient_id, skip = 0, take = 50 } = filters;

    const where: Record<string, unknown> = { clinic_id: clinicId };
    if (status) where['status'] = status;
    if (patient_id) where['patient_insurance'] = { patient_id };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.insurancePreAuth.count({ where }),
      this.prisma.insurancePreAuth.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: PRE_AUTH_INCLUDE,
      }),
    ]);

    return { total, items };
  }

  // ─── Get one ──────────────────────────────────────────────────────────────

  async findOne(id: string, clinicId: string) {
    const pa = await this.prisma.insurancePreAuth.findFirst({
      where: { id, clinic_id: clinicId },
      include: PRE_AUTH_INCLUDE,
    });
    if (!pa) throw new NotFoundException('Pre-authorisation not found');
    return pa;
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(clinicId: string, dto: CreatePreAuthDto) {
    // Verify the enrollment belongs to this clinic
    const enrollment = await this.prisma.patientInsurance.findFirst({
      where: { id: dto.patient_insurance_id, clinic_id: clinicId },
      select: { id: true, plan: { select: { requires_preauth: true } } },
    });
    if (!enrollment) throw new NotFoundException('Patient insurance enrollment not found');

    return this.prisma.insurancePreAuth.create({
      data: {
        clinic_id: clinicId,
        patient_insurance_id: dto.patient_insurance_id,
        treatment_plan_id: dto.treatment_plan_id ?? null,
        notes: dto.notes ?? null,
        status: 'REQUESTED',
      },
      include: PRE_AUTH_INCLUDE,
    });
  }

  // ─── Submit (REQUESTED → SUBMITTED) ──────────────────────────────────────

  async submit(id: string, clinicId: string, dto: SubmitPreAuthDto, userId: string) {
    const pa = await this.prisma.insurancePreAuth.findFirst({ where: { id, clinic_id: clinicId } });
    if (!pa) throw new NotFoundException('Pre-authorisation not found');
    if (pa.status !== 'REQUESTED') throw new BadRequestException('Only REQUESTED pre-auths can be submitted');

    return this.prisma.insurancePreAuth.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submission_method: dto.submission_method,
        submission_ref: dto.submission_ref ?? null,
        submitted_at: new Date(),
        submitted_by_user_id: userId,
        notes: dto.notes ?? pa.notes,
      },
      include: PRE_AUTH_INCLUDE,
    });
  }

  // ─── Update status (admin — record insurer decision) ─────────────────────

  async updateStatus(id: string, clinicId: string, dto: UpdatePreAuthStatusDto) {
    const pa = await this.prisma.insurancePreAuth.findFirst({ where: { id, clinic_id: clinicId } });
    if (!pa) throw new NotFoundException('Pre-authorisation not found');

    const allowed = ALLOWED_TRANSITIONS[pa.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(`Cannot transition from ${pa.status} to ${dto.status}`);
    }

    const data: Record<string, unknown> = { status: dto.status };
    if (dto.approval_code !== undefined) data['approval_code'] = dto.approval_code;
    if (dto.approved_amount_cap !== undefined) data['approved_amount_cap'] = dto.approved_amount_cap;
    if (dto.valid_from !== undefined) data['valid_from'] = new Date(dto.valid_from);
    if (dto.valid_to !== undefined) data['valid_to'] = new Date(dto.valid_to);
    if (dto.notes !== undefined) data['notes'] = dto.notes;
    if (['APPROVED', 'REJECTED'].includes(dto.status)) data['decision_at'] = new Date();

    return this.prisma.insurancePreAuth.update({
      where: { id },
      data,
      include: PRE_AUTH_INCLUDE,
    });
  }

  // ─── File upload ──────────────────────────────────────────────────────────

  async uploadDocument(id: string, clinicId: string, slot: 'request' | 'approval' | 'rejection', file: Express.Multer.File) {
    const pa = await this.prisma.insurancePreAuth.findFirst({
      where: { id, clinic_id: clinicId },
      select: { id: true, request_pdf_url: true, approval_letter_url: true, rejection_letter_url: true },
    });
    if (!pa) throw new NotFoundException('Pre-authorisation not found');

    const saved = await this.files.save({ clinicId, subdir: 'preauth', file });

    const fieldMap: Record<string, string> = {
      request:   'request_pdf_url',
      approval:  'approval_letter_url',
      rejection: 'rejection_letter_url',
    };

    // Remove old file from disk
    const oldPath = (pa as Record<string, unknown>)[fieldMap[slot]] as string | null;
    await this.files.remove(oldPath);

    return this.prisma.insurancePreAuth.update({
      where: { id },
      data: { [fieldMap[slot]]: saved.file_url },
      include: PRE_AUTH_INCLUDE,
    });
  }

  // ─── Download token ───────────────────────────────────────────────────────

  async getDownloadToken(id: string, clinicId: string, slot: 'request' | 'approval' | 'rejection') {
    const pa = await this.prisma.insurancePreAuth.findFirst({
      where: { id, clinic_id: clinicId },
      select: { request_pdf_url: true, approval_letter_url: true, rejection_letter_url: true },
    });
    if (!pa) throw new NotFoundException('Pre-authorisation not found');

    const fieldMap = {
      request:   pa.request_pdf_url,
      approval:  pa.approval_letter_url,
      rejection: pa.rejection_letter_url,
    };

    const filePath = fieldMap[slot];
    if (!filePath) throw new NotFoundException(`No ${slot} document uploaded yet`);

    const { token } = this.files.buildDownloadUrl({ clinicId, filePath });
    return { token, file_url: filePath };
  }

  serveFile(clinicId: string, filePath: string, token: string) {
    return this.files.resolveForServing({ clinicId, filePath, token });
  }
}
