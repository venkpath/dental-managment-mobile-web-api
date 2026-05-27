import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { S3Service } from '../../common/services/s3.service.js';
import { CreateBranchDto, UpdateBranchDto, UpdateBranchSchedulingDto } from './dto/index.js';
import { Branch } from '@prisma/client';

const PHOTO_ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const PHOTO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class BranchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  async create(clinicId: string, dto: CreateBranchDto): Promise<Branch> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        id: true,
        custom_max_branches: true,
        plan: { select: { max_branches: true } },
      },
    });
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID "${clinicId}" not found`);
    }

    // custom_max_branches (set by super admin) wins over plan default; null = unlimited.
    const limit = clinic.custom_max_branches ?? clinic.plan?.max_branches ?? null;
    if (limit !== null) {
      const current = await this.prisma.branch.count({ where: { clinic_id: clinicId } });
      if (current >= limit) {
        throw new ForbiddenException(
          `Branch limit reached: your plan allows ${limit} branch${limit === 1 ? '' : 'es'}. Contact support to add more.`,
        );
      }
    }

    return this.prisma.branch.create({
      data: { ...dto, clinic_id: clinicId },
    });
  }

  async findAll(clinicId: string): Promise<Branch[]> {
    return this.prisma.branch.findMany({
      where: { clinic_id: clinicId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(clinicId: string, id: string): Promise<Branch> {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
    });
    if (!branch || branch.clinic_id !== clinicId) {
      throw new NotFoundException(`Branch with ID "${id}" not found`);
    }
    return branch;
  }

  async update(clinicId: string, id: string, dto: UpdateBranchDto): Promise<Branch> {
    await this.findOne(clinicId, id);
    return this.prisma.branch.update({
      where: { id },
      data: dto,
    });
  }

  async updateSchedulingSettings(clinicId: string, id: string, dto: UpdateBranchSchedulingDto): Promise<Branch> {
    const branch = await this.findOne(clinicId, id);

    // Validate working hours consistency (merge with existing values for partial updates)
    const effectiveStart = dto.working_start_time ?? branch.working_start_time ?? '09:00';
    const effectiveEnd = dto.working_end_time ?? branch.working_end_time ?? '18:00';
    if (effectiveStart >= effectiveEnd) {
      throw new BadRequestException('working_start_time must be before working_end_time');
    }
    const effectiveLunchStart = dto.lunch_start_time ?? branch.lunch_start_time;
    const effectiveLunchEnd = dto.lunch_end_time ?? branch.lunch_end_time;
    if (effectiveLunchStart && effectiveLunchEnd && effectiveLunchStart >= effectiveLunchEnd) {
      throw new BadRequestException('lunch_start_time must be before lunch_end_time');
    }

    return this.prisma.branch.update({
      where: { id },
      data: dto,
    });
  }

  async getSchedulingSettings(clinicId: string, id: string) {
    const branch = await this.findOne(clinicId, id);
    return {
      working_start_time: branch.working_start_time ?? '09:00',
      working_end_time: branch.working_end_time ?? '18:00',
      lunch_start_time: branch.lunch_start_time ?? null,
      lunch_end_time: branch.lunch_end_time ?? null,
      slot_duration: branch.slot_duration ?? 15,
      default_appt_duration: branch.default_appt_duration ?? 30,
      buffer_minutes: branch.buffer_minutes ?? 0,
      advance_booking_days: branch.advance_booking_days ?? 30,
      working_days: branch.working_days ?? '1,2,3,4,5,6',
    };
  }

  async uploadPhoto(
    clinicId: string,
    branchId: string,
    file: { buffer: Buffer; mimetype: string; size: number },
  ): Promise<{ photo_url: string }> {
    const branch = await this.findOne(clinicId, branchId);
    if (!file?.buffer || file.size === 0) throw new BadRequestException('No file uploaded');
    if (file.size > PHOTO_MAX_BYTES) throw new BadRequestException('Photo must be 5 MB or smaller');
    if (!PHOTO_ALLOWED_MIME.includes(file.mimetype)) throw new BadRequestException('Photo must be PNG, JPEG, or WebP');

    // Delete the previous photo from S3 before uploading the new one.
    if (branch.photo_url) {
      await this.s3.delete(branch.photo_url).catch(() => null);
    }

    const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const key = `clinics/${branch.clinic_id}/branch-photos/${branchId}.${ext}`;
    await this.s3.upload(key, file.buffer, file.mimetype);
    await this.prisma.branch.update({ where: { id: branchId }, data: { photo_url: key } });

    const signed = await this.s3.getSignedUrl(key).catch(() => null);
    return { photo_url: signed ?? key };
  }

  async deletePhoto(clinicId: string, branchId: string): Promise<{ message: string }> {
    const branch = await this.findOne(clinicId, branchId);
    if (branch.photo_url) {
      await this.s3.delete(branch.photo_url).catch(() => null);
    }
    await this.prisma.branch.update({ where: { id: branchId }, data: { photo_url: null } });
    return { message: 'Photo removed' };
  }
}
