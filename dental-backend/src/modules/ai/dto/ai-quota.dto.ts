import { IsBoolean, IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class UpdateAiSettingsDto {
  @IsBoolean()
  overage_enabled!: boolean;
}

export class CreateAiQuotaApprovalRequestDto {
  @IsInt()
  @Min(1)
  requested_amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class DecideAiQuotaApprovalRequestDto {
  @IsString()
  status!: 'approved' | 'rejected';

  @IsOptional()
  @IsInt()
  @Min(0)
  approved_amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class MarkOverageChargePaidDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  payment_reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
