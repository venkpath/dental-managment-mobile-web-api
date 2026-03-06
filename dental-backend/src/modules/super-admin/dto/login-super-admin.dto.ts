import { IsString, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginSuperAdminDto {
  @ApiProperty({ example: 'admin@dental-saas.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongP@ss1', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
