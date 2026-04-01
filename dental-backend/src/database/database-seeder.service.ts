import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { PasswordService } from '../common/services/password.service.js';

@Injectable()
export class DatabaseSeederService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseSeederService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
  ) {}

  async onModuleInit() {
    try {
      await this.seedTeeth();
      await this.seedSurfaces();
      await this.seedSuperAdmin();
      await this.seedPlans();
      await this.seedFeatures();
      await this.seedPlanFeatures();
      await this.seedTestClinic();
    } catch (err) {
      this.logger.warn('Auto-seed encountered an error', err);
    }
  }

  private async seedTeeth() {
    const count = await this.prisma.tooth.count();
    if (count > 0) return;

    const teeth = [
      { fdi_number: 11, name: 'Upper Right Central Incisor', quadrant: 1, position: 1 },
      { fdi_number: 12, name: 'Upper Right Lateral Incisor', quadrant: 1, position: 2 },
      { fdi_number: 13, name: 'Upper Right Canine', quadrant: 1, position: 3 },
      { fdi_number: 14, name: 'Upper Right First Premolar', quadrant: 1, position: 4 },
      { fdi_number: 15, name: 'Upper Right Second Premolar', quadrant: 1, position: 5 },
      { fdi_number: 16, name: 'Upper Right First Molar', quadrant: 1, position: 6 },
      { fdi_number: 17, name: 'Upper Right Second Molar', quadrant: 1, position: 7 },
      { fdi_number: 18, name: 'Upper Right Third Molar', quadrant: 1, position: 8 },
      { fdi_number: 21, name: 'Upper Left Central Incisor', quadrant: 2, position: 1 },
      { fdi_number: 22, name: 'Upper Left Lateral Incisor', quadrant: 2, position: 2 },
      { fdi_number: 23, name: 'Upper Left Canine', quadrant: 2, position: 3 },
      { fdi_number: 24, name: 'Upper Left First Premolar', quadrant: 2, position: 4 },
      { fdi_number: 25, name: 'Upper Left Second Premolar', quadrant: 2, position: 5 },
      { fdi_number: 26, name: 'Upper Left First Molar', quadrant: 2, position: 6 },
      { fdi_number: 27, name: 'Upper Left Second Molar', quadrant: 2, position: 7 },
      { fdi_number: 28, name: 'Upper Left Third Molar', quadrant: 2, position: 8 },
      { fdi_number: 31, name: 'Lower Left Central Incisor', quadrant: 3, position: 1 },
      { fdi_number: 32, name: 'Lower Left Lateral Incisor', quadrant: 3, position: 2 },
      { fdi_number: 33, name: 'Lower Left Canine', quadrant: 3, position: 3 },
      { fdi_number: 34, name: 'Lower Left First Premolar', quadrant: 3, position: 4 },
      { fdi_number: 35, name: 'Lower Left Second Premolar', quadrant: 3, position: 5 },
      { fdi_number: 36, name: 'Lower Left First Molar', quadrant: 3, position: 6 },
      { fdi_number: 37, name: 'Lower Left Second Molar', quadrant: 3, position: 7 },
      { fdi_number: 38, name: 'Lower Left Third Molar', quadrant: 3, position: 8 },
      { fdi_number: 41, name: 'Lower Right Central Incisor', quadrant: 4, position: 1 },
      { fdi_number: 42, name: 'Lower Right Lateral Incisor', quadrant: 4, position: 2 },
      { fdi_number: 43, name: 'Lower Right Canine', quadrant: 4, position: 3 },
      { fdi_number: 44, name: 'Lower Right First Premolar', quadrant: 4, position: 4 },
      { fdi_number: 45, name: 'Lower Right Second Premolar', quadrant: 4, position: 5 },
      { fdi_number: 46, name: 'Lower Right First Molar', quadrant: 4, position: 6 },
      { fdi_number: 47, name: 'Lower Right Second Molar', quadrant: 4, position: 7 },
      { fdi_number: 48, name: 'Lower Right Third Molar', quadrant: 4, position: 8 },
    ];

    for (const t of teeth) {
      await this.prisma.tooth.upsert({ where: { fdi_number: t.fdi_number }, update: {}, create: t });
    }
    this.logger.log('Seeded 32 FDI teeth');
  }

  private async seedSurfaces() {
    const count = await this.prisma.toothSurface.count();
    if (count > 0) return;

    const surfaces = [
      { name: 'Mesial', code: 'M' },
      { name: 'Distal', code: 'D' },
      { name: 'Buccal', code: 'B' },
      { name: 'Lingual', code: 'L' },
      { name: 'Occlusal', code: 'O' },
    ];

    for (const s of surfaces) {
      await this.prisma.toothSurface.upsert({ where: { name: s.name }, update: {}, create: s });
    }
    this.logger.log('Seeded 5 tooth surfaces');
  }

  private async seedSuperAdmin() {
    const count = await this.prisma.superAdmin.count();
    if (count > 0) return;

    const email = process.env['SUPER_ADMIN_EMAIL'] || 'admin@dental-saas.com';
    const password = process.env['SUPER_ADMIN_PASSWORD'] || 'Admin@123';
    const name = process.env['SUPER_ADMIN_NAME'] || 'Platform Admin';

    const hash = await this.passwordService.hash(password);
    await this.prisma.superAdmin.create({
      data: { email, password_hash: hash, name },
    });
    this.logger.log(`Seeded super admin "${email}"`);
  }

  private async seedPlans() {
    const count = await this.prisma.plan.count();
    if (count > 0) return;

    const plans = [
      { name: 'Starter', price_monthly: 999, max_branches: 1, max_staff: 5, ai_quota: 0 },
      { name: 'Professional', price_monthly: 2499, max_branches: 3, max_staff: 15, ai_quota: 100 },
      { name: 'Enterprise', price_monthly: 4999, max_branches: 10, max_staff: 50, ai_quota: 500 },
    ];

    for (const p of plans) {
      await this.prisma.plan.upsert({ where: { name: p.name }, update: {}, create: p });
    }
    this.logger.log('Seeded 3 plans');
  }

  private async seedFeatures() {
    const features = [
      { key: 'AI_CLINICAL_NOTES', description: 'AI-generated SOAP clinical notes' },
      { key: 'AI_PRESCRIPTION', description: 'AI-powered prescription generation' },
      { key: 'AI_TREATMENT_PLAN', description: 'AI-assisted treatment planning' },
      { key: 'SMS_REMINDERS', description: 'SMS appointment reminders' },
      { key: 'WHATSAPP_INTEGRATION', description: 'WhatsApp messaging for patient communication' },
      { key: 'DIGITAL_XRAY', description: 'Digital X-ray management and storage' },
      { key: 'INVENTORY_MANAGEMENT', description: 'Dental inventory and supply tracking' },
      { key: 'CUSTOM_PROVIDER_CONFIG', description: 'Override default email/SMS provider config per clinic' },
      { key: 'PATIENT_IMPORT', description: 'Bulk patient import from CSV/Excel and AI image extraction' },
      { key: 'WHATSAPP_INBOX', description: 'WhatsApp inbox — receive and reply to patient messages (requires own WABA)' },
    ];

    let created = 0;
    for (const f of features) {
      const existing = await this.prisma.feature.findUnique({ where: { key: f.key } });
      if (!existing) {
        await this.prisma.feature.create({ data: f });
        created++;
      }
    }
    if (created > 0) this.logger.log(`Seeded ${created} new features`);
  }

  private async seedPlanFeatures() {
    const starter = await this.prisma.plan.findUnique({ where: { name: 'Starter' } });
    const professional = await this.prisma.plan.findUnique({ where: { name: 'Professional' } });
    const enterprise = await this.prisma.plan.findUnique({ where: { name: 'Enterprise' } });
    const allFeatures = await this.prisma.feature.findMany();
    if (!starter || !professional || !enterprise || allFeatures.length === 0) return;

    const fm = Object.fromEntries(allFeatures.map((f) => [f.key, f.id]));

    const mappings = [
      { plan_id: starter.id, feature_id: fm['INVENTORY_MANAGEMENT']! },
      { plan_id: professional.id, feature_id: fm['INVENTORY_MANAGEMENT']! },
      { plan_id: professional.id, feature_id: fm['SMS_REMINDERS']! },
      { plan_id: professional.id, feature_id: fm['DIGITAL_XRAY']! },
      { plan_id: professional.id, feature_id: fm['AI_CLINICAL_NOTES']! },
      { plan_id: professional.id, feature_id: fm['AI_PRESCRIPTION']! },
      { plan_id: professional.id, feature_id: fm['CUSTOM_PROVIDER_CONFIG']! },
      { plan_id: enterprise.id, feature_id: fm['INVENTORY_MANAGEMENT']! },
      { plan_id: enterprise.id, feature_id: fm['SMS_REMINDERS']! },
      { plan_id: enterprise.id, feature_id: fm['DIGITAL_XRAY']! },
      { plan_id: enterprise.id, feature_id: fm['AI_CLINICAL_NOTES']! },
      { plan_id: enterprise.id, feature_id: fm['AI_PRESCRIPTION']! },
      { plan_id: enterprise.id, feature_id: fm['AI_TREATMENT_PLAN']! },
      { plan_id: enterprise.id, feature_id: fm['WHATSAPP_INTEGRATION']! },
      { plan_id: enterprise.id, feature_id: fm['CUSTOM_PROVIDER_CONFIG']! },
      // Patient Import — Professional & Enterprise only (not Starter)
      { plan_id: professional.id, feature_id: fm['PATIENT_IMPORT']! },
      { plan_id: enterprise.id, feature_id: fm['PATIENT_IMPORT']! },
      // WhatsApp Inbox — Enterprise only (requires own WABA number)
      { plan_id: enterprise.id, feature_id: fm['WHATSAPP_INBOX']! },
    ];

    let created = 0;
    for (const m of mappings) {
      const existing = await this.prisma.planFeature.findUnique({
        where: { plan_id_feature_id: { plan_id: m.plan_id, feature_id: m.feature_id } },
      });
      if (!existing) {
        await this.prisma.planFeature.create({ data: { ...m, is_enabled: true } });
        created++;
      }
    }
    if (created > 0) this.logger.log(`Seeded ${created} new plan-feature mappings`);
  }

  private async seedTestClinic() {
    const testEmail = 'demo@smiledental.in';
    const existing = await this.prisma.clinic.findFirst({ where: { email: testEmail } });
    if (existing) return;

    const professional = await this.prisma.plan.findUnique({ where: { name: 'Professional' } });
    if (!professional) return;

    const clinic = await this.prisma.clinic.create({
      data: {
        name: 'Smile Dental Clinic',
        email: testEmail,
        phone: '+91-9876543210',
        address: '42 MG Road, Indiranagar',
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        plan_id: professional.id,
        subscription_status: 'active',
        trial_ends_at: null,
      },
    });

    const branch = await this.prisma.branch.create({
      data: {
        clinic_id: clinic.id,
        name: 'Main Branch',
        phone: '+91-9876543210',
        address: '42 MG Road, Indiranagar',
        city: 'Bangalore',
        state: 'Karnataka',
      },
    });

    const testUsers = [
      { name: 'Dr. Priya Sharma', email: 'priya@smiledental.in', role: 'Admin', password: 'Admin@123' },
      { name: 'Dr. Rahul Verma', email: 'rahul@smiledental.in', role: 'Dentist', password: 'Dentist@123' },
      { name: 'Dr. Anjali Patel', email: 'anjali@smiledental.in', role: 'Dentist', password: 'Dentist@123' },
      { name: 'Meera Nair', email: 'meera@smiledental.in', role: 'Receptionist', password: 'Reception@123' },
      { name: 'Suresh Kumar', email: 'suresh@smiledental.in', role: 'Staff', password: 'Staff@123' },
    ];

    for (const u of testUsers) {
      const hash = await this.passwordService.hash(u.password);
      await this.prisma.user.create({
        data: {
          clinic_id: clinic.id,
          branch_id: branch.id,
          name: u.name,
          email: u.email,
          password_hash: hash,
          role: u.role,
          status: 'active',
        },
      });
    }

    this.logger.log(`Seeded test clinic "${clinic.name}" with ${testUsers.length} users`);
  }
}
