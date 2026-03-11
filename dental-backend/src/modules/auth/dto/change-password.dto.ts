import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldP@ss123' })
  @IsString()
  @MinLength(8)
  old_password!: string;

  @ApiProperty({ example: 'NewP@ss456' })
  @IsString()
  @MinLength(8)
  new_password!: string;
}
