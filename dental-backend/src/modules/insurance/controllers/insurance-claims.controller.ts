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
import { InsuranceClaimsService } from '../services/insurance-claims.service.js';
import { SubmitClaimDto, UpdateClaimStatusDto, RecordClaimPaymentDto } from '../dto/create-claim.dto.js';

@ApiTags('Insurance — Claims')
@ApiHeader({ name: 'x-clinic-id', required: true })
@UseGuards(RequireClinicGuard)
@RequireFeature('INSURANCE_MODULE')
@Controller('insurance/claims')
export class InsuranceClaimsController {
  constructor(private readonly claimsService: InsuranceClaimsService) {}

  // GET /insurance/claims?status=DRAFT&from=2024-01-01&to=2024-12-31
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECEPTIONIST)
  findAll(
    @CurrentClinic() clinicId: string,
    @Query('status') status?: string,
    @Query('patient_id') patient_id?: string,
    @Query('provider_id') provider_id?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip?: number,
    @Query('take', new DefaultValuePipe(50), ParseIntPipe) take?: number,
  ) {
    return this.claimsService.findAll(clinicId, { status, patient_id, provider_id, from, to, skip, take });
  }

  // GET /insurance/claims/stats
  @Get('stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  getStats(@CurrentClinic() clinicId: string) {
    return this.claimsService.getStats(clinicId);
  }

  // GET /insurance/claims/monthly-received
  @Get('monthly-received')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  getMonthlyReceived(@CurrentClinic() clinicId: string) {
    return this.claimsService.getMonthlyReceived(clinicId);
  }

  // GET /insurance/claims/by-invoice/:invoiceId
  @Get('by-invoice/:invoiceId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DENTIST, UserRole.CONSULTANT)
  findByInvoice(@CurrentClinic() clinicId: string, @Param('invoiceId') invoiceId: string) {
    return this.claimsService.findByInvoice(invoiceId, clinicId);
  }

  // GET /insurance/claims/:id
  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DENTIST, UserRole.CONSULTANT)
  findOne(@CurrentClinic() clinicId: string, @Param('id') id: string) {
    return this.claimsService.findOne(id, clinicId);
  }

  // POST /insurance/claims/:id/submit
  @Post(':id/submit')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.RECEPTIONIST)
  submit(
    @CurrentClinic() clinicId: string,
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: SubmitClaimDto,
  ) {
    return this.claimsService.submit(id, clinicId, dto, user.sub);
  }

  // POST /insurance/claims/:id/status
  @Post(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  updateStatus(
    @CurrentClinic() clinicId: string,
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: UpdateClaimStatusDto,
  ) {
    return this.claimsService.updateStatus(id, clinicId, dto, user.sub);
  }

  // POST /insurance/claims/:id/payment
  @Post(':id/payment')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  recordPayment(
    @CurrentClinic() clinicId: string,
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: RecordClaimPaymentDto,
  ) {
    return this.claimsService.recordPayment(id, clinicId, dto, user.sub);
  }
}
