import { PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsUUID, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto.js';

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password', 'branch_id'] as const),
) {
  @ApiPropertyOptional({ example: null, description: 'Branch UUID, or null to assign to all branches' })
  @IsOptional()
  @Transform(({ value }) => (value === '' ? null : value))
  @ValidateIf((o) => o.branch_id !== null)
  @IsUUID('4')
  branch_id?: string | null;

  @ApiPropertyOptional({ enum: UserStatus, example: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
