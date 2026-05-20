import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { FeatureModule } from '../feature/feature.module.js';
import { InsuranceProvidersController } from './controllers/insurance-providers.controller.js';
import { ClinicEmpanelmentController } from './controllers/clinic-empanelment.controller.js';
import { PatientInsuranceController } from './controllers/patient-insurance.controller.js';
import { InsuranceModuleController } from './controllers/insurance-module.controller.js';
import { InsuranceProvidersService } from './services/insurance-providers.service.js';
import { ClinicEmpanelmentService } from './services/clinic-empanelment.service.js';
import { PatientInsuranceService } from './services/patient-insurance.service.js';
import { InsuranceFileService } from './services/insurance-file.service.js';
import { IndiaInsuranceStrategy } from './strategies/india.strategy.js';
import { InsuranceStrategyFactory } from './strategies/strategy.factory.js';

/**
 * Phase 7 — Insurance & EHS end-to-end module.
 *
 * Wires up:
 *   - Master catalogue (InsuranceProvidersService)
 *   - Stage 0: Clinic empanelment (ClinicEmpanelmentService)
 *   - Stage 1+2: Patient enrollment + eligibility (PatientInsuranceService)
 *   - Country-specific behaviour via strategy pattern (India for now;
 *     USA / Canada slot in by adding new strategy classes + factory cases).
 *
 * Pre-auth, claims, reimbursement reconciliation, and reporting land in
 * follow-up sprints — those services will live in the same module and reuse
 * InsuranceFileService for uploads/downloads.
 */
@Module({
  imports: [PrismaModule, AuthModule, FeatureModule],
  controllers: [
    InsuranceProvidersController,
    ClinicEmpanelmentController,
    PatientInsuranceController,
    InsuranceModuleController,
  ],
  providers: [
    InsuranceProvidersService,
    ClinicEmpanelmentService,
    PatientInsuranceService,
    InsuranceFileService,
    IndiaInsuranceStrategy,
    InsuranceStrategyFactory,
  ],
  exports: [
    InsuranceProvidersService,
    ClinicEmpanelmentService,
    PatientInsuranceService,
    InsuranceFileService,
    InsuranceStrategyFactory,
  ],
})
export class InsuranceModule {}
