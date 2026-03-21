import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateCampaignContentDto {
  @ApiProperty({ example: 'Diwali Special Checkup Offer' })
  @IsString()
  campaign_name!: string;

  @ApiProperty({ example: 'promotional' })
  @IsString()
  campaign_type!: string;

  @ApiProperty({ example: 'sms' })
  @IsString()
  channel!: string;

  @ApiProperty({ example: 'Inactive patients for 3+ months' })
  @IsString()
  target_audience!: string;

  @ApiProperty({ example: 150 })
  @IsInt()
  @Min(1)
  audience_size!: number;

  @ApiPropertyOptional({ example: '20% off on teeth whitening' })
  @IsOptional()
  @IsString()
  special_offer?: string;

  @ApiPropertyOptional({ example: 'Festival season campaign' })
  @IsOptional()
  @IsString()
  additional_context?: string;
}
