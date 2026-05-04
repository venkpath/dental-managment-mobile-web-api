import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateClinicLimitsDto {
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
}
