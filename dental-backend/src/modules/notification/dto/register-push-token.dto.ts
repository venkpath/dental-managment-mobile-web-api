import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterPushTokenDto {
  @ApiProperty({ description: 'Expo push token from the mobile app' })
  @IsString()
  @MinLength(10)
  @MaxLength(255)
  token!: string;

  @ApiPropertyOptional({ enum: ['ios', 'android'] })
  @IsOptional()
  @IsIn(['ios', 'android'])
  platform?: 'ios' | 'android';

  @ApiPropertyOptional({ description: 'Stable device identifier from the client' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  device_id?: string;
}

export class UnregisterPushTokenDto {
  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(255)
  token!: string;
}
