import { IsEnum, IsOptional, IsString, IsNumber, IsDateString, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

// ─── Submit ───────────────────────────────────────────────────────────────────

export class SubmitClaimDto {
  @IsEnum(['PORTAL', 'EMAIL', 'PHYSICAL', 'COURIER', 'EDI_837'])
  submission_method!: string;

  @IsOptional()
  @IsString()
  submission_ref?: string;

  @IsOptional()
  @IsString()
  claim_number?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── Status update ────────────────────────────────────────────────────────────

export class UpdateClaimStatusDto {
  @IsEnum(['SUBMITTED', 'UNDER_REVIEW', 'QUERY_RAISED', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'CANCELLED'])
  status!: string;

  @IsOptional()
  @IsString()
  claim_number?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  approved_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  patient_portion?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  disallowed_amount?: number;

  @IsOptional()
  @IsString()
  rejection_reason?: string;

  @IsOptional()
  @IsString()
  query_text?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── Record payment ───────────────────────────────────────────────────────────

export class RecordClaimPaymentDto {
  @IsNumber()
  @Min(0)
  paid_amount!: number;

  @IsOptional()
  @IsDateString()
  paid_at?: string;

  @IsOptional()
  @IsString()
  bank_utr_ref?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── Reimbursement allocation ─────────────────────────────────────────────────

export class ReimbursementAllocationDto {
  @IsString()
  claim_id!: string;

  @IsNumber()
  @Min(0)
  allocated_amount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  disallowed_amount?: number;

  @IsOptional()
  @IsString()
  disallowance_reason?: string;

  @IsOptional()
  @IsEnum(['WRITE_OFF', 'REBILL_PATIENT', 'NONE'])
  action_taken?: string;
}

// ─── Reimbursement ────────────────────────────────────────────────────────────

export class CreateReimbursementDto {
  @IsDateString()
  received_at!: string;

  @IsNumber()
  @Min(0)
  amount_received!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tds_deducted?: number;

  @IsOptional()
  @IsString()
  bank_utr_ref?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReimbursementAllocationDto)
  allocations!: ReimbursementAllocationDto[];
}
