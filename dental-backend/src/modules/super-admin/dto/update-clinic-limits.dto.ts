import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Per-clinic numeric limit overrides. Every field is independently optional;
 * pass null to clear a previously-set override (revert to plan default) or
 * omit it entirely to leave it unchanged. The Clinic columns these map to
 * also serve as the source of truth for /me/features so the frontend caps
 * stay in sync with backend enforcement.
 */
export class UpdateClinicLimitsDto {
  // ─── Structural caps (used by the UI to gate "Add branch / Add user") ───

  @ApiPropertyOptional({ description: 'Max branches override (null = use plan default)', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  custom_max_branches?: number | null;

  @ApiPropertyOptional({ description: 'Max staff/users override (null = use plan default)', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  custom_max_staff?: number | null;

  @ApiPropertyOptional({ description: 'Per-cycle AI request quota override (null = use plan default)', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  ai_quota_override?: number | null;

  // ─── Monthly resource counters (enforced by PlanLimitService) ───

  @ApiPropertyOptional({ description: 'Monthly patient limit override (null = use plan default)', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  custom_patient_limit?: number | null;

  @ApiPropertyOptional({ description: 'Monthly appointment limit override (null = use plan default)', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  custom_appointment_limit?: number | null;

  @ApiPropertyOptional({ description: 'Monthly invoice limit override (null = use plan default)', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  custom_invoice_limit?: number | null;

  @ApiPropertyOptional({ description: 'Monthly treatment limit override (null = use plan default)', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  custom_treatment_limit?: number | null;

  @ApiPropertyOptional({ description: 'Monthly prescription limit override (null = use plan default)', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  custom_prescription_limit?: number | null;

  @ApiPropertyOptional({ description: 'Monthly consultation limit override (null = use plan default)', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  custom_consultation_limit?: number | null;

  // ─── BYO WABA limit ───

  @ApiPropertyOptional({ description: 'Monthly WhatsApp hard cap for BYO-WABA Enterprise clinics (null = use default 2000). Ignored when clinic.has_own_waba is false.', nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  custom_waba_monthly_limit?: number | null;
}
