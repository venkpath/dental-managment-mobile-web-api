import { PartialType } from '@nestjs/swagger';
import { CreatePatientInsuranceDto } from './create-patient-insurance.dto.js';

export class UpdatePatientInsuranceDto extends PartialType(CreatePatientInsuranceDto) {}
