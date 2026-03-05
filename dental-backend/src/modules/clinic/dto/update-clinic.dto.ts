import { PartialType } from '@nestjs/swagger';
import { CreateClinicDto } from './create-clinic.dto.js';

export class UpdateClinicDto extends PartialType(CreateClinicDto) {}
