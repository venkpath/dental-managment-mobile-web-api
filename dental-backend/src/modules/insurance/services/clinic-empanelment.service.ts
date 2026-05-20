import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service.js';
import { InsuranceFileService } from './insurance-file.service.js';
import type { CreateEmpanelmentDto } from '../dto/create-empanelment.dto.js';
import type { UpdateEmpanelmentDto } from '../dto/update-empanelment.dto.js';

const empanelmentInclude = {
  provider: { select: { id: true, name: true, short_code: true, type: true, country: true, claim_method: true, tpa_name: true } },
} as const;

/**
 * Stage 0 of the insurance lifecycle — clinic registers its empanelment
 * with each scheme/insurer it is authorised to bill directly. Without an
 * ACTIVE empanelment for a scheme, the clinic can still record patient
 * coverage (so the patient can self-reimburse) but cannot bill the scheme.
 */
@Injectable()
export class ClinicEmpanelmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly files: InsuranceFileService,
  ) {}

  async list(clinicId: string) {
    return this.prisma.clinicEmpanelment.findMany({
      where: { clinic_id: clinicId },
      include: empanelmentInclude,
      orderBy: { created_at: 'desc' },
    });
  }

  async get(clinicId: string, id: string) {
    const row = await this.prisma.clinicEmpanelment.findUnique({
      where: { id },
      include: empanelmentInclude,
    });
    if (!row || row.clinic_id !== clinicId) {
      throw new NotFoundException('Empanelment not found');
    }
    return row;
  }

  async create(clinicId: string, dto: CreateEmpanelmentDto) {
    await this.ensureProviderVisible(clinicId, dto.provider_id);

    const duplicate = await this.prisma.clinicEmpanelment.findUnique({
      where: { clinic_id_provider_id: { clinic_id: clinicId, provider_id: dto.provider_id } },
    });
    if (duplicate) {
      throw new ConflictException('This clinic already has an empanelment record for that provider — update it instead.');
    }

    return this.prisma.clinicEmpanelment.create({
      data: {
        clinic_id: clinicId,
        provider_id: dto.provider_id,
        empanelment_number: dto.empanelment_number,
        valid_from: dto.valid_from ? new Date(dto.valid_from) : null,
        valid_to: dto.valid_to ? new Date(dto.valid_to) : null,
        bank_account_name: dto.bank_account_name,
        bank_account_number: dto.bank_account_number,
        bank_ifsc: dto.bank_ifsc,
        bank_name: dto.bank_name,
        contact_person_name: dto.contact_person_name,
        contact_person_phone: dto.contact_person_phone,
        contact_person_email: dto.contact_person_email,
        notes: dto.notes,
        status: dto.status ?? 'ACTIVE',
      },
      include: empanelmentInclude,
    });
  }

  async update(clinicId: string, id: string, dto: UpdateEmpanelmentDto) {
    const existing = await this.get(clinicId, id);
    return this.prisma.clinicEmpanelment.update({
      where: { id: existing.id },
      data: {
        empanelment_number: dto.empanelment_number ?? undefined,
        valid_from: dto.valid_from !== undefined ? (dto.valid_from ? new Date(dto.valid_from) : null) : undefined,
        valid_to: dto.valid_to !== undefined ? (dto.valid_to ? new Date(dto.valid_to) : null) : undefined,
        bank_account_name: dto.bank_account_name ?? undefined,
        bank_account_number: dto.bank_account_number ?? undefined,
        bank_ifsc: dto.bank_ifsc ?? undefined,
        bank_name: dto.bank_name ?? undefined,
        contact_person_name: dto.contact_person_name ?? undefined,
        contact_person_phone: dto.contact_person_phone ?? undefined,
        contact_person_email: dto.contact_person_email ?? undefined,
        notes: dto.notes ?? undefined,
        status: dto.status ?? undefined,
      },
      include: empanelmentInclude,
    });
  }

  async remove(clinicId: string, id: string) {
    const existing = await this.get(clinicId, id);
    // Best-effort cleanup of uploaded files
    await Promise.all([
      this.files.remove(existing.certificate_url),
      this.files.remove(existing.rate_card_url),
      this.files.remove(existing.tpa_mou_url),
    ]);
    await this.prisma.clinicEmpanelment.delete({ where: { id: existing.id } });
    return { deleted: true };
  }

  /**
   * Replace one of the three document slots (certificate / rate card / MoU)
   * for an empanelment row. Old file (if any) is removed from disk.
   */
  async uploadDocument(
    clinicId: string,
    id: string,
    slot: 'certificate' | 'rate_card' | 'tpa_mou',
    file: Express.Multer.File,
  ) {
    const existing = await this.get(clinicId, id);
    const saved = await this.files.save({ clinicId, subdir: 'empanelment', file });

    const fieldByslot = {
      certificate: 'certificate_url',
      rate_card: 'rate_card_url',
      tpa_mou: 'tpa_mou_url',
    } as const;
    const field = fieldByslot[slot];
    if (!field) throw new BadRequestException(`Invalid document slot: ${slot}`);

    // Snapshot the old path before overwriting
    const previous = (existing as Record<string, unknown>)[field] as string | null;
    const updated = await this.prisma.clinicEmpanelment.update({
      where: { id: existing.id },
      data: { [field]: saved.file_url },
      include: empanelmentInclude,
    });
    if (previous) await this.files.remove(previous);
    return updated;
  }

  /**
   * Convenience for the eligibility banner / claim builder: returns the
   * active empanelment for a given scheme provider (or null if not
   * empanelled).
   */
  async findActiveEmpanelment(clinicId: string, providerId: string) {
    return this.prisma.clinicEmpanelment.findUnique({
      where: { clinic_id_provider_id: { clinic_id: clinicId, provider_id: providerId } },
    });
  }

  private async ensureProviderVisible(clinicId: string, providerId: string) {
    const provider = await this.prisma.insuranceProvider.findUnique({ where: { id: providerId } });
    if (!provider || (provider.clinic_id !== null && provider.clinic_id !== clinicId)) {
      throw new NotFoundException('Insurance provider not found');
    }
    if (!provider.is_active) {
      throw new BadRequestException('Insurance provider is inactive');
    }
  }
}
