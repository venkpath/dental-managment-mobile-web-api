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

  @ApiProperty({ description: 'Phone Number ID from session logging message event', required: false })
  @IsString()
  @IsOptional()
  phoneNumberId?: string;

  @ApiProperty({ description: 'WABA ID from session logging message event', required: false })
  @IsString()
  @IsOptional()
  wabaId?: string;

  @ApiProperty({ description: 'Redirect URI (page URL) used during FB.login popup — required for code exchange', required: false })
  @IsString()
  @IsOptional()
  redirectUri?: string;
}
