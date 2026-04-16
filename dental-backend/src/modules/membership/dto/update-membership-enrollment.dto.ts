import { IsIn, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { CreateMembershipEnrollmentDto } from './create-membership-enrollment.dto.js';

export class UpdateMembershipEnrollmentDto extends PartialType(CreateMembershipEnrollmentDto) {
  @ApiPropertyOptional({ enum: ['active', 'expired', 'cancelled', 'paused'] })
  @IsOptional()
  @IsIn(['active', 'expired', 'cancelled', 'paused'])
  status?: string;
}