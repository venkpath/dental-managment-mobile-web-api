import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiHeader,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AttachmentService } from './attachment.service.js';
import { CreateAttachmentDto } from './dto/index.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';

@ApiTags('Attachments')
@ApiHeader({ name: 'x-clinic-id', required: true, description: 'Clinic UUID for tenant scoping' })
@ApiBadRequestResponse({ description: 'Missing or invalid x-clinic-id header' })
@UseGuards(RequireClinicGuard)
@Controller()
export class AttachmentController {
  constructor(private readonly attachmentService: AttachmentService) {}

  @Post('attachments')
  @ApiOperation({ summary: 'Upload a new attachment' })
  @ApiCreatedResponse({ description: 'Attachment created successfully' })
  @ApiNotFoundResponse({ description: 'Branch, patient, or user not found in this clinic' })
  async create(
    @CurrentClinic() clinicId: string,
    @Body() dto: CreateAttachmentDto,
  ) {
    return this.attachmentService.create(clinicId, dto);
  }

  @Get('patients/:patientId/attachments')
  @ApiOperation({ summary: 'Get all attachments for a patient' })
  @ApiOkResponse({ description: 'List of patient attachments' })
  @ApiNotFoundResponse({ description: 'Patient not found in this clinic' })
  async findByPatient(
    @CurrentClinic() clinicId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.attachmentService.findByPatient(clinicId, patientId);
  }
}
