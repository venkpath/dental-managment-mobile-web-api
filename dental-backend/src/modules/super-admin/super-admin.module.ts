import { Module } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller.js';
import { SuperAdminService } from './super-admin.service.js';
import { SuperAdminAuthService } from './super-admin-auth.service.js';
import { SuperAdminWhatsAppService } from './super-admin-whatsapp.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { ClinicModule } from '../clinic/clinic.module.js';
import { AutomationModule } from '../automation/automation.module.js';
import { BranchModule } from '../branch/branch.module.js';

@Module({
  imports: [AuthModule, ClinicModule, AutomationModule, BranchModule],
  controllers: [SuperAdminController],
  providers: [SuperAdminService, SuperAdminAuthService, SuperAdminWhatsAppService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}
