import { Module } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller.js';
import { SuperAdminService } from './super-admin.service.js';
import { SuperAdminAuthService } from './super-admin-auth.service.js';
import { SuperAdminWhatsAppService } from './super-admin-whatsapp.service.js';
import { PlatformTemplateController } from './platform-template.controller.js';
import { PlatformTemplateService } from './platform-template.service.js';
import { InactivityCronService } from './inactivity.cron.js';
import { AuthModule } from '../auth/auth.module.js';
import { ClinicModule } from '../clinic/clinic.module.js';
import { AutomationModule } from '../automation/automation.module.js';
import { BranchModule } from '../branch/branch.module.js';
import { ReportsModule } from '../reports/reports.module.js';
import { FeatureModule } from '../feature/feature.module.js';

@Module({
  imports: [AuthModule, ClinicModule, AutomationModule, BranchModule, ReportsModule, FeatureModule],
  controllers: [SuperAdminController, PlatformTemplateController],
  providers: [SuperAdminService, SuperAdminAuthService, SuperAdminWhatsAppService, PlatformTemplateService, InactivityCronService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}
