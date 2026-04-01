import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class WhatsAppEmbeddedSignupDto {
  @ApiProperty({ description: 'Authorization code from Meta Embedded Signup popup' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ description: 'Page URL where FB.login() was initiated (used as redirect_uri for token exchange)' })
  @IsString()
  @IsNotEmpty()
  redirectUri!: string;
}
