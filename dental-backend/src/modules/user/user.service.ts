import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { PasswordService } from '../../common/services/password.service.js';
import { S3Service } from '../../common/services/s3.service.js';
import { CreateUserDto, UpdateUserDto } from './dto/index.js';
import { User } from '@prisma/client';

const userSelect = {
  id: true,
  clinic_id: true,
  branch_id: true,
  branch: { select: { id: true, name: true } },
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  email_verified: true,
  phone_verified: true,
  must_change_password: true,
  is_doctor: true,
  license_number: true,
  signature_url: true,
  profile_photo_url: true,
  // directory / profile fields
  listed_in_directory: true,
  bio: true,
  years_experience: true,
  education: true,
  specializations: true,
  treatments_offered: true,
  languages_spoken: true,
  consultation_fee: true,
  created_at: true,
  updated_at: true,
} as const;

const SIGNATURE_ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const SIGNATURE_MAX_BYTES = 1 * 1024 * 1024; // 1 MB
const PROFILE_PHOTO_ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

/** Slugify a name into a filesystem-safe segment (lowercase, dashes). */
function slugify(input: string): string {
  return input.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'user';
}

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly s3Service: S3Service,
  ) {}

  /** Convert stored S3 keys (signature_url, profile_photo_url) into
   *  short-lived presigned URLs so private S3 objects can be rendered
   *  by the browser without exposing the bucket publicly. */
  private async withSignedUrls<
    T extends { signature_url?: string | null; profile_photo_url?: string | null },
  >(record: T): Promise<T> {
    const sig = record.signature_url;
    const photo = record.profile_photo_url;
    const [signedSig, signedPhoto] = await Promise.all([
      sig ? this.s3Service.getSignedUrl(sig).catch(() => null) : Promise.resolve(null),
      photo ? this.s3Service.getSignedUrl(photo).catch(() => null) : Promise.resolve(null),
    ]);
    return {
      ...record,
      signature_url: signedSig ?? sig ?? null,
      profile_photo_url: signedPhoto ?? photo ?? null,
    };
  }

  /** Upload a signature image for a user. Stored in S3 under a per-clinic
   *  key; the key is saved on user.signature_url and re-fetched at PDF
   *  generation time so signed URLs never expire mid-print. */
  async uploadSignature(
    clinicId: string,
    userId: string,
    file: { buffer: Buffer; mimetype: string; size: number; originalname?: string },
  ): Promise<{ signature_url: string }> {
    await this.findOne(clinicId, userId);

    if (!file?.buffer || file.size === 0) {
      throw new BadRequestException('No file uploaded');
    }
    if (file.size > SIGNATURE_MAX_BYTES) {
      throw new BadRequestException('Signature must be 1 MB or smaller');
    }
    if (!SIGNATURE_ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('Signature must be a PNG, JPEG, or WebP image');
    }

    const ext = file.mimetype === 'image/png'  ? 'png'
              : file.mimetype === 'image/webp' ? 'webp'
              : 'jpg';
    const key = `clinics/${clinicId}/doctor-signatures/${userId}.${ext}`;
    await this.s3Service.upload(key, file.buffer, file.mimetype);

    await this.prisma.user.update({
      where: { id: userId },
      data: { signature_url: key },
    });

    // Return a presigned URL so the client can immediately preview the
    // freshly-uploaded signature without a separate fetch round-trip.
    const signed = await this.s3Service.getSignedUrl(key).catch(() => null);
    return { signature_url: signed ?? key };
  }

  /** Upload a profile photo for a staff member. Stored privately in S3
   *  under `clinics/{clinicId}/staff-photos/{slug(name)}_{userId}.{ext}`. */
  async uploadProfilePhoto(
    clinicId: string,
    userId: string,
    file: { buffer: Buffer; mimetype: string; size: number; originalname?: string },
  ): Promise<{ profile_photo_url: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, clinic_id: true, name: true, profile_photo_url: true },
    });
    if (!user || user.clinic_id !== clinicId) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    if (!file?.buffer || file.size === 0) {
      throw new BadRequestException('No file uploaded');
    }
    if (file.size > PROFILE_PHOTO_MAX_BYTES) {
      throw new BadRequestException('Profile photo must be 5 MB or smaller');
    }
    if (!PROFILE_PHOTO_ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('Profile photo must be a PNG, JPEG, or WebP image');
    }

    const ext = file.mimetype === 'image/png'  ? 'png'
              : file.mimetype === 'image/webp' ? 'webp'
              : 'jpg';
    const slug = slugify(user.name);
    const key = `clinics/${clinicId}/staff-photos/${slug}_${userId}.${ext}`;
    const previousKey = user.profile_photo_url;
    await this.s3Service.upload(key, file.buffer, file.mimetype);

    await this.prisma.user.update({
      where: { id: userId },
      data: { profile_photo_url: key },
    });

    if (previousKey && previousKey !== key) {
      await this.s3Service.delete(previousKey).catch(() => null);
    }

    const signed = await this.s3Service.getSignedUrl(key).catch(() => null);
    return { profile_photo_url: signed ?? key };
  }

  async deleteProfilePhoto(clinicId: string, userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, clinic_id: true, profile_photo_url: true },
    });
    if (!user || user.clinic_id !== clinicId) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }
    const previousKey = user.profile_photo_url;
    await this.prisma.user.update({
      where: { id: userId },
      data: { profile_photo_url: null },
    });
    if (previousKey) {
      await this.s3Service.delete(previousKey).catch(() => null);
    }
    return { message: 'Profile photo removed' };
  }

  async create(clinicId: string, dto: CreateUserDto): Promise<Omit<User, 'password_hash'>> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        id: true,
        custom_max_staff: true,
        plan: { select: { max_staff: true } },
      },
    });
    if (!clinic) {
      throw new NotFoundException(`Clinic with ID "${clinicId}" not found`);
    }

    // custom_max_staff (set by super admin) wins over plan default; null = unlimited.
    // All user records (active + inactive) count against the seat limit — an inactive
    // account still occupies a licensed slot and can be reactivated at any time.
    const staffLimit = clinic.custom_max_staff ?? clinic.plan?.max_staff ?? null;
    if (staffLimit !== null) {
      const current = await this.prisma.user.count({ where: { clinic_id: clinicId } });
      if (current >= staffLimit) {
        throw new ForbiddenException(
          `Staff limit reached: your plan allows ${staffLimit} staff member${staffLimit === 1 ? '' : 's'}. Contact support to add more.`,
        );
      }
    }

    if (dto.branch_id) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branch_id },
      });
      if (!branch || branch.clinic_id !== clinicId) {
        throw new NotFoundException(
          `Branch with ID "${dto.branch_id}" not found in this clinic`,
        );
      }
    }

    const existing = await this.prisma.user.findUnique({
      where: { email_clinic_id: { email: dto.email, clinic_id: clinicId } },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists in this clinic');
    }

    const { password, ...rest } = dto;
    const finalPassword = password || 'Admin@123';
    const created = await this.prisma.user.create({
      data: { ...rest, clinic_id: clinicId, password_hash: await this.passwordService.hash(finalPassword) },
      select: userSelect,
    });
    return this.withSignedUrls(created);
  }

  async findByEmail(email: string, clinicId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email_clinic_id: { email, clinic_id: clinicId } },
    });
  }

  async findAll(clinicId: string, role?: string, search?: string, branchId?: string): Promise<Omit<User, 'password_hash'>[]> {
    const where: any = { clinic_id: clinicId };
    if (role) {
      // Accept comma-separated roles, e.g. "Dentist,Consultant"
      const roles = role.split(',').map((r) => r.trim()).filter(Boolean);
      const isDoctorQuery = roles.some((r) => r.toLowerCase() === 'dentist' || r.toLowerCase() === 'consultant');
      if (isDoctorQuery) {
        // Include users with is_doctor=true regardless of their role (e.g. SuperAdmin who is also a doctor)
        where.AND = [
          ...(where.AND ?? []),
          { OR: [{ role: roles.length > 1 ? { in: roles } : roles[0] }, { is_doctor: true }] },
        ];
      } else {
        where.role = roles.length > 1 ? { in: roles } : roles[0];
      }
    }
    if (branchId) where.branch_id = branchId;
    if (search) {
      where.AND = [
        ...(where.AND ?? []),
        { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] },
      ];
    }
    const users = await this.prisma.user.findMany({
      where,
      orderBy: { created_at: 'desc' },
      select: userSelect,
    });
    return Promise.all(users.map((u) => this.withSignedUrls(u)));
  }

  async findOne(clinicId: string, id: string): Promise<Omit<User, 'password_hash'>> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!user || user.clinic_id !== clinicId) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }
    return this.withSignedUrls(user);
  }

  async remove(clinicId: string, id: string): Promise<{ message: string }> {
    await this.findOne(clinicId, id); // validates existence + clinic ownership
    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted successfully' };
  }

  async getAvailability(clinicId: string, userId: string) {
    await this.findOne(clinicId, userId);
    const rows = await this.prisma.doctorAvailability.findMany({
      where: { user_id: userId, clinic_id: clinicId },
      orderBy: { day_of_week: 'asc' },
    });
    return rows;
  }

  async upsertAvailability(
    clinicId: string,
    userId: string,
    schedule: { day_of_week: number; start_time: string; end_time: string; is_day_off?: boolean }[],
  ) {
    await this.findOne(clinicId, userId);
    await this.prisma.$transaction(
      schedule.map((day) =>
        this.prisma.doctorAvailability.upsert({
          where: { user_id_day_of_week: { user_id: userId, day_of_week: day.day_of_week } },
          create: { user_id: userId, clinic_id: clinicId, day_of_week: day.day_of_week, start_time: day.start_time, end_time: day.end_time, is_day_off: day.is_day_off ?? false },
          update: { start_time: day.start_time, end_time: day.end_time, is_day_off: day.is_day_off ?? false },
        }),
      ),
    );
    return this.getAvailability(clinicId, userId);
  }

  // ─── Feature grants ────────────────────────────────────────────────────

  async getFeatureGrants(clinicId: string, userId: string): Promise<string[]> {
    await this.findOne(clinicId, userId);
    try {
      const rows = await this.prisma.userFeatureAccess.findMany({
        where: { user_id: userId },
        select: { feature_key: true },
      });
      return rows.map((r) => r.feature_key);
    } catch {
      // Table may not exist yet — return empty grants gracefully
      return [];
    }
  }

  async setFeatureGrants(clinicId: string, userId: string, featureKeys: string[]): Promise<string[]> {
    await this.findOne(clinicId, userId);
    try {
      const existing = await this.prisma.userFeatureAccess.findMany({
        where: { user_id: userId },
        select: { feature_key: true },
      });
      const existingKeys = new Set(existing.map((r) => r.feature_key));
      const newKeys = new Set(featureKeys);

      const toAdd    = featureKeys.filter((k) => !existingKeys.has(k));
      const toRemove = [...existingKeys].filter((k) => !newKeys.has(k));

      if (toAdd.length > 0 || toRemove.length > 0) {
        await this.prisma.$transaction([
          ...(toRemove.length > 0
            ? [this.prisma.userFeatureAccess.deleteMany({ where: { user_id: userId, feature_key: { in: toRemove } } })]
            : []),
          ...toAdd.map((key) => this.prisma.userFeatureAccess.create({ data: { user_id: userId, feature_key: key } })),
        ]);
      }
    } catch {
      // Table may not exist yet — migration pending
    }
    return featureKeys;
  }

  async update(clinicId: string, id: string, dto: UpdateUserDto): Promise<Omit<User, 'password_hash'>> {
    const user = await this.findOne(clinicId, id);
    const data: UpdateUserDto = { ...dto };
    // Public directory uses listed_in_directory — ensure doctor flag stays in sync.
    if (data.listed_in_directory === true && !data.is_doctor && !user.is_doctor) {
      const role = data.role ?? user.role;
      if (['SuperAdmin', 'Admin', 'Dentist', 'Consultant'].includes(role)) {
        data.is_doctor = true;
      }
    }
    if (dto.branch_id) {
      const branch = await this.prisma.branch.findUnique({
        where: { id: dto.branch_id },
      });
      if (!branch || branch.clinic_id !== user.clinic_id) {
        throw new NotFoundException(
          `Branch with ID "${dto.branch_id}" not found in this clinic`,
        );
      }
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
    return this.withSignedUrls(updated);
  }
}
