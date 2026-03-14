import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiOkResponse } from '@nestjs/swagger';
import { RequireClinicGuard } from '../../common/guards/require-clinic.guard.js';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../user/dto/index.js';
import { AutomationService } from './automation.service.js';
import { AutomationCronService } from './automation.cron.js';
import { UpsertAutomationRuleDto } from './dto/index.js';

@ApiTags('Automation Rules')
@ApiHeader({ name: 'x-clinic-id', required: true })
@UseGuards(RequireClinicGuard)
@Controller('automation/rules')
export class AutomationController {
  constructor(
    private readonly automationService: AutomationService,
    private readonly automationCronService: AutomationCronService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all automation rules for the clinic (creates defaults on first access)' })
  @ApiOkResponse({ description: 'List of automation rules with enable/disable status and config' })
  async getAllRules(@CurrentClinic() clinicId: string) {
    return this.automationService.getAllRules(clinicId);
  }

  @Get(':ruleType')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get a specific automation rule' })
  async getRule(
    @CurrentClinic() clinicId: string,
    @Param('ruleType') ruleType: string,
  ) {
    return this.automationService.getRule(clinicId, ruleType);
  }

  @Patch(':ruleType')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Enable/disable or configure an automation rule' })
  async upsertRule(
    @CurrentClinic() clinicId: string,
    @Param('ruleType') ruleType: string,
    @Body() dto: UpsertAutomationRuleDto,
  ) {
    return this.automationService.upsertRule(clinicId, ruleType, dto);
  }

  // ─── Manual Cron Triggers (for testing) ───

  @Post('trigger-crons')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manually trigger all automation crons (birthday, festival, appointment, payment, dormant, treatment)' })
  async triggerCrons() {
    const results: Record<string, string> = {};

    const jobs = [
      { name: 'birthdayGreetings', fn: () => this.automationCronService.birthdayGreetings() },
      { name: 'festivalGreetings', fn: () => this.automationCronService.festivalGreetings() },
      { name: 'appointmentRemindersToPatients', fn: () => this.automationCronService.appointmentRemindersToPatients() },
      { name: 'paymentReminders', fn: () => this.automationCronService.paymentReminders() },
      { name: 'dormantPatientDetection', fn: () => this.automationCronService.dormantPatientDetection() },
      { name: 'treatmentPlanReminders', fn: () => this.automationCronService.treatmentPlanReminders() },
    ];

    for (const job of jobs) {
      try {
        await job.fn();
        results[job.name] = 'success';
      } catch (e) {
        results[job.name] = `error: ${(e as Error).message}`;
      }
    }

    return { message: 'Automation crons triggered manually', results };
  }

  @Post('trigger/:jobName')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Manually trigger a single automation cron job by name' })
  async triggerSingleCron(@Param('jobName') jobName: string) {
    const jobMap: Record<string, () => Promise<void>> = {
      birthdayGreetings: () => this.automationCronService.birthdayGreetings(),
      festivalGreetings: () => this.automationCronService.festivalGreetings(),
      appointmentRemindersToPatients: () => this.automationCronService.appointmentRemindersToPatients(),
      paymentReminders: () => this.automationCronService.paymentReminders(),
      dormantPatientDetection: () => this.automationCronService.dormantPatientDetection(),
      treatmentPlanReminders: () => this.automationCronService.treatmentPlanReminders(),
    };

    const fn = jobMap[jobName];
    if (!fn) {
      throw new (await import('@nestjs/common')).BadRequestException(
        `Unknown job: ${jobName}. Valid jobs: ${Object.keys(jobMap).join(', ')}`,
      );
    }

    try {
      await fn();
      return { job: jobName, status: 'success' };
    } catch (e) {
      return { job: jobName, status: 'error', error: (e as Error).message };
    }
  }
}
