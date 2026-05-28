import {
  Controller, Get, Post, Param, Query, Body,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { CurrentClinic } from '../../../common/decorators/current-clinic.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { RequireClinicGuard } from '../../../common/guards/require-clinic.guard.js';
import { RequireFeature } from '../../../common/decorators/require-feature.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { UserRole } from '../../user/dto/index.js';
import { InsuranceReimbursementService } from '../services/insurance-reimbursement.service.js';
import { CreateReimbursementDto } from '../dto/create-claim.dto.js';

@ApiTags('Insurance — Reimbursements')
@ApiHeader({ name: 'x-clinic-id', required: true })
@UseGuards(RequireClinicGuard)
@RequireFeature('INSURANCE_MODULE')
@Controller('insurance/reimbursements')
export class InsuranceReimbursementController {
  constructor(private readonly reimbursementService: InsuranceReimbursementService) {}

  // GET /insurance/reimbursements?from=2024-01-01&to=2024-12-31
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  findAll(
    @CurrentClinic() clinicId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(50), ParseIntPipe) take?: number,
  ) {
    return this.reimbursementService.findAll(clinicId, { from, to, skip, take });
  }

  // GET /insurance/reimbursements/:id
  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  findOne(@CurrentClinic() clinicId: string, @Param('id') id: string) {
    return this.reimbursementService.findOne(id, clinicId);
  }

  // POST /insurance/reimbursements
  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  create(
    @CurrentClinic() clinicId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateReimbursementDto,
  ) {
    return this.reimbursementService.create(clinicId, dto, user.sub);
  }
}
