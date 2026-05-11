import { Controller, Post, Get, Param, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator.js';
import { PrismaService } from '../../database/prisma.service.js';
import { QrCodeService } from '../branch/qr-code.service.js';
import { PlanLimitService } from '../../common/services/plan-limit.service.js';
import { SelfRegisterPatientDto } from './dto/self-register-patient.dto.js';

// Strip everything that isn't a digit. Used to compare phone numbers across
// the many formats users actually type (+91-9876543210, 09876543210, etc.).
function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, '');
}

// Indian mobiles are 10 digits; the last 10 digits are the canonical form.
// Falls back to the full digit string for shorter inputs.
function last10(phone: string): string {
  const d = digitsOnly(phone);
  return d.length >= 10 ? d.slice(-10) : d;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

@ApiTags('Patient Self-Registration (Public)')
@Controller('public/patients')
export class PatientSelfRegisterController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly qrCodeService: QrCodeService,
    private readonly planLimit: PlanLimitService,
  ) {}

  @Get('branch-info/:token')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  @ApiOperation({ summary: 'Get branch info for a QR token (shown on the registration form)' })
  @ApiOkResponse({ description: 'Branch name, clinic name and logo for display on the form' })
  async getBranchInfo(@Param('token') token: string) {
    const branch = await this.qrCodeService.findBranchByToken(token);
    const { clinic } = branch;

    // logo_url is stored as an S3 key: "clinics/{id}/logos/{filename}"
    // Return a relative API path so the frontend can prepend its API base URL.
    let logo_path: string | null = null;
    if (clinic?.logo_url) {
      const filename = clinic.logo_url.split('/').pop();
      if (filename) {
        logo_path = `clinic/logo/${clinic.id}/${filename}`;
      }
    }

    return {
      branch_name: branch.name,
      clinic_name: clinic?.name ?? '',
      city: branch.city ?? '',
      logo_path,
    };
  }

  @Post('self-register/:token')
  @Public()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Patient self-registration via branch QR code' })
  @ApiCreatedResponse({ description: 'Patient registered successfully' })
  async selfRegister(
    @Param('token') token: string,
    @Body() dto: SelfRegisterPatientDto,
  ) {
    const branch = await this.qrCodeService.findBranchByToken(token);
    const clinicId = branch.clinic_id;

    if (!dto.phone || dto.phone.trim() === '') {
      throw new BadRequestException('Phone number is required');
    }

    const phone = dto.phone.trim();
    const phoneLast10 = last10(phone);
    if (phoneLast10.length < 10) {
      throw new BadRequestException('Please enter a valid 10-digit mobile number');
    }

    const firstNameNorm = normalizeName(dto.first_name);
    const lastNameNorm = normalizeName(dto.last_name);

    // Dedupe BEFORE consuming a plan-cap slot so a returning patient never
    // gets a confusing "limit exceeded" error.
    // Same phone + same name → treat as already registered.
    // Same phone + different name → allowed (families often share a phone).
    const candidates = await this.prisma.patient.findMany({
      where: { clinic_id: clinicId, phone: { contains: phoneLast10 } },
      select: { id: true, first_name: true, last_name: true, phone: true },
    });
    const duplicate = candidates.find(
      (c) =>
        last10(c.phone) === phoneLast10 &&
        normalizeName(c.first_name) === firstNameNorm &&
        normalizeName(c.last_name) === lastNameNorm,
    );
    if (duplicate) {
      return {
        success: true,
        message: 'You are already registered at this clinic.',
        already_registered: true,
      };
    }

    await this.planLimit.enforceMonthlyCap(clinicId, 'patients');

    const patient = await this.prisma.patient.create({
      data: {
        clinic_id: clinicId,
        branch_id: branch.id,
        first_name: dto.first_name.trim(),
        last_name: dto.last_name.trim(),
        phone,
        email: dto.email?.trim() || undefined,
        gender: dto.gender ?? 'Other',
        ...(dto.date_of_birth ? { date_of_birth: new Date(dto.date_of_birth) } : {}),
        ...(dto.age !== undefined ? { age: dto.age } : {}),
      },
      select: { id: true, first_name: true, last_name: true },
    });

    return {
      success: true,
      message: `Welcome, ${patient.first_name}! You have been registered successfully.`,
      already_registered: false,
      patient_id: patient.id,
    };
  }
}
