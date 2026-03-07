import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiHeader,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service.js';
import { QueryAuditLogDto } from './dto/index.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';

@ApiTags('Audit Logs')
@ApiHeader({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' })
@ApiBadRequestResponse({ description: 'Missing or invalid x-clinic-id header' })
@UseGuards(RequireClinicGuard)
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'List audit logs for the clinic' })
  @ApiOkResponse({ description: 'List of audit log entries' })
  async findAll(
    @CurrentClinic() clinicId: string,
    @Query() query: QueryAuditLogDto,
  ) {
    return this.auditLogService.findByClinic(clinicId, query);
  }
}
