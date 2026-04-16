import { PartialType } from '@nestjs/swagger';
import { CreateMembershipPlanDto } from './create-membership-plan.dto.js';

export class UpdateMembershipPlanDto extends PartialType(CreateMembershipPlanDto) {}