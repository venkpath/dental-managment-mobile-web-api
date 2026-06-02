import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token issued at login' })
  @IsString()
  @MinLength(10)
  refresh_token!: string;
}
