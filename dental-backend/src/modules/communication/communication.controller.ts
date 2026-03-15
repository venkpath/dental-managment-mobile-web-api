import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { CommunicationService } from './communication.service.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { QueryMessageDto } from './dto/query-message.dto.js';
import { UpdatePreferencesDto } from './dto/update-preferences.dto.js';
import { UpdateClinicSettingsDto } from './dto/update-clinic-settings.dto.js';

@ApiTags('Communication')
@ApiHeader({ name: 'x-clinic-id', required: true })
@UseGuards(RequireClinicGuard)
@Controller('communication')
export class CommunicationController {
  constructor(private readonly communicationService: CommunicationService) {}

  // ─── Messages ───

  @Post('messages')
  @ApiOperation({ summary: 'Send a message to a patient' })
  @ApiCreatedResponse({ description: 'Message queued for delivery' })
  async sendMessage(
    @CurrentClinic() clinicId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.communicationService.sendMessage(clinicId, dto);
  }

  @Get('messages')
  @ApiOperation({ summary: 'List communication messages (with logs)' })
  @ApiOkResponse({ description: 'Paginated message list' })
  async findAllMessages(
    @CurrentClinic() clinicId: string,
    @Query() query: QueryMessageDto,
  ) {
    return this.communicationService.findAllMessages(clinicId, query);
  }

  @Get('messages/:id')
  @ApiOperation({ summary: 'Get a message with delivery logs' })
  async findOneMessage(
    @CurrentClinic() clinicId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.communicationService.findOneMessage(clinicId, id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get communication statistics' })
  async getStats(
    @CurrentClinic() clinicId: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.communicationService.getMessageStats(clinicId, startDate, endDate);
  }

  // ─── Patient Preferences ───

  @Get('patients/:patientId/preferences')
  @ApiOperation({ summary: 'Get patient communication preferences' })
  async getPreferences(
    @CurrentClinic() clinicId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ) {
    return this.communicationService.getPatientPreferences(clinicId, patientId);
  }

  @Patch('patients/:patientId/preferences')
  @ApiOperation({ summary: 'Update patient communication preferences' })
  async updatePreferences(
    @CurrentClinic() clinicId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: UpdatePreferencesDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;
    return this.communicationService.updatePatientPreferences(
      clinicId, patientId, dto, 'clinic_staff', ipAddress,
    );
  }

  // ─── Clinic Settings ───

  @Get('settings')
  @ApiOperation({ summary: 'Get clinic communication settings' })
  async getSettings(@CurrentClinic() clinicId: string) {
    return this.communicationService.getClinicSettings(clinicId);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update clinic communication settings (enable/disable channels, configure providers)' })
  async updateSettings(
    @CurrentClinic() clinicId: string,
    @Body() dto: UpdateClinicSettingsDto,
  ) {
    return this.communicationService.updateClinicSettings(clinicId, dto);
  }

  // ─── Test Email (SMTP verification) ───

  @Post('test-email')
  @ApiOperation({ summary: 'Send a test email to verify SMTP configuration' })
  @ApiCreatedResponse({ description: 'Test email sent' })
  async sendTestEmail(
    @CurrentClinic() clinicId: string,
    @Body() body: { to: string },
  ) {
    if (!body.to) {
      throw new BadRequestException('Property "to" (email address) is required');
    }
    return this.communicationService.sendTestEmail(clinicId, body.to);
  }

  @Post('test-sms')
  @ApiOperation({
    summary: 'Send a test SMS to verify MSG91/DLT configuration',
    description: 'Uses the SMS template configured via env vars (SMS_OTP_TEMPLATE / SMS_OTP_TEMPLATE_ID). ' +
      'Pass optional "variables" to fill {#var#} placeholders in the template body. ' +
      'To change the template, update the env vars and restart — no code changes needed.',
  })
  @ApiCreatedResponse({ description: 'Test SMS sent' })
  async sendTestSms(
    @CurrentClinic() clinicId: string,
    @Body() body: { to: string; dlt_template_id?: string; variables?: Record<string, string> },
  ) {
    if (!body.to) {
      throw new BadRequestException('Property "to" (phone number) is required');
    }
    return this.communicationService.sendTestSms(clinicId, body.to, body.dlt_template_id, body.variables);
  }

  @Post('verify-smtp')
  @ApiOperation({ summary: 'Verify SMTP connectivity without sending an email' })
  @ApiOkResponse({ description: 'SMTP verification result' })
  async verifySmtp(@CurrentClinic() clinicId: string) {
    return this.communicationService.verifySmtp(clinicId);
  }
}
