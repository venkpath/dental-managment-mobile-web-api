import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class WhatsAppEmbeddedSignupDto {
  @ApiProperty({ description: 'Authorization code from Meta Embedded Signup popup', required: false })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({ description: 'Access token returned directly from Meta Embedded Signup popup', required: false })
  @IsString()
  @IsOptional()
  accessToken?: string;
}
