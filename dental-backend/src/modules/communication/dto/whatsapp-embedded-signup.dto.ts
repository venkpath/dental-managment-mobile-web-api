import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class WhatsAppEmbeddedSignupDto {
  @ApiProperty({ description: 'Authorization code from Meta Embedded Signup popup' })
  @IsString()
  @IsNotEmpty()
  code!: string;
}
