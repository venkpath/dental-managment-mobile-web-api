import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LookupDto {
  @ApiProperty({ example: 'jane@clinic.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongP@ss1' })
  @IsString()
  @MinLength(8)
  password!: string;
}
