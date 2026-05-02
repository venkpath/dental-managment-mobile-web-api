"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DatabaseSeederService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseSeederService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("./prisma.service.js");
const password_service_js_1 = require("../common/services/password.service.js");
let DatabaseSeederService = DatabaseSeederService_1 = class DatabaseSeederService {
    prisma;
    passwordService;
    logger = new common_1.Logger(DatabaseSeederService_1.name);
    constructor(prisma, passwordService) {
        this.prisma = prisma;
        this.passwordService = passwordService;
    }
    async onModuleInit() {
        try {
            await this.seedTeeth();
            await this.seedSurfaces();
            await this.seedSuperAdmin();
            await this.seedPlans();
            await this.seedFeatures();
            await this.seedPlanFeatures();
            await this.seedTestClinic();
        }
        catch (err) {
            this.logger.warn('Auto-seed encountered an error', err);
        }
    }
    async seedTeeth() {
        const count = await this.prisma.tooth.count();
        if (count > 0)
            return;
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
    async seedSurfaces() {
        const count = await this.prisma.toothSurface.count();
        if (count > 0)
            return;
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
    async seedSuperAdmin() {
        const count = await this.prisma.superAdmin.count();
        if (count > 0)
            return;
        const email = process.env['SUPER_ADMIN_EMAIL'] || 'admin@dental-saas.com';
        const password = process.env['SUPER_ADMIN_PASSWORD'] || 'Admin@123';
        const name = process.env['SUPER_ADMIN_NAME'] || 'Platform Admin';
        const hash = await this.passwordService.hash(password);
        await this.prisma.superAdmin.create({
            data: { email, password_hash: hash, name },
        });
        this.logger.log(`Seeded super admin "${email}"`);
    }
    async seedPlans() {
        const plans = [
            { name: 'Free', price_monthly: 0, max_branches: 1, max_staff: 2, ai_quota: 0, max_patients_per_month: 20, max_appointments_per_month: 20, max_invoices_per_month: 20, max_treatments_per_month: 20 },
            { name: 'Starter', price_monthly: 999, max_branches: 1, max_staff: 5, ai_quota: 0, max_patients_per_month: null, max_appointments_per_month: null, max_invoices_per_month: null, max_treatments_per_month: null },
            { name: 'Professional', price_monthly: 1999, max_branches: 3, max_staff: 15, ai_quota: 100, max_patients_per_month: null, max_appointments_per_month: null, max_invoices_per_month: null, max_treatments_per_month: null },
            { name: 'Enterprise', price_monthly: 2999, max_branches: 10, max_staff: 50, ai_quota: 500, max_patients_per_month: null, max_appointments_per_month: null, max_invoices_per_month: null, max_treatments_per_month: null },
        ];
        let created = 0;
        for (const p of plans) {
            const existing = await this.prisma.plan.findUnique({ where: { name: p.name } });
            if (!existing) {
                await this.prisma.plan.create({ data: p });
                created++;
            }
        }
        if (created > 0)
            this.logger.log(`Seeded ${created} new plans`);
    }
    async seedFeatures() {
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
            { key: 'MARKETING_CAMPAIGNS', description: 'Bulk marketing campaigns (SMS/Email/WhatsApp) with segmentation, A/B tests, drip sequences' },
            { key: 'AUTOMATION_RULES', description: 'Automation rules — birthday greetings, reactivation, payment reminders, post-visit follow-ups' },
            { key: 'AI_CAMPAIGN_CONTENT', description: 'AI-powered campaign message generation with A/B variants' },
            { key: 'APPOINTMENT_CONFIRMATIONS', description: 'Automated appointment confirmation messages to patients' },
        ];
        let created = 0;
        for (const f of features) {
            const existing = await this.prisma.feature.findUnique({ where: { key: f.key } });
            if (!existing) {
                await this.prisma.feature.create({ data: f });
                created++;
            }
        }
        if (created > 0)
            this.logger.log(`Seeded ${created} new features`);
    }
    async seedPlanFeatures() {
        const free = await this.prisma.plan.findUnique({ where: { name: 'Free' } });
        const starter = await this.prisma.plan.findUnique({ where: { name: 'Starter' } });
        const professional = await this.prisma.plan.findUnique({ where: { name: 'Professional' } });
        const enterprise = await this.prisma.plan.findUnique({ where: { name: 'Enterprise' } });
        const allFeatures = await this.prisma.feature.findMany();
        if (!free || !starter || !professional || !enterprise || allFeatures.length === 0)
            return;
        const fm = Object.fromEntries(allFeatures.map((f) => [f.key, f.id]));
        const mappings = [
            { plan_id: free.id, feature_id: fm['INVENTORY_MANAGEMENT'] },
            { plan_id: starter.id, feature_id: fm['INVENTORY_MANAGEMENT'] },
            { plan_id: starter.id, feature_id: fm['APPOINTMENT_CONFIRMATIONS'] },
            { plan_id: starter.id, feature_id: fm['SMS_REMINDERS'] },
            { plan_id: professional.id, feature_id: fm['INVENTORY_MANAGEMENT'] },
            { plan_id: professional.id, feature_id: fm['APPOINTMENT_CONFIRMATIONS'] },
            { plan_id: professional.id, feature_id: fm['SMS_REMINDERS'] },
            { plan_id: professional.id, feature_id: fm['WHATSAPP_INTEGRATION'] },
            { plan_id: professional.id, feature_id: fm['DIGITAL_XRAY'] },
            { plan_id: professional.id, feature_id: fm['AI_CLINICAL_NOTES'] },
            { plan_id: professional.id, feature_id: fm['AI_PRESCRIPTION'] },
            { plan_id: professional.id, feature_id: fm['CUSTOM_PROVIDER_CONFIG'] },
            { plan_id: professional.id, feature_id: fm['PATIENT_IMPORT'] },
            { plan_id: professional.id, feature_id: fm['MARKETING_CAMPAIGNS'] },
            { plan_id: professional.id, feature_id: fm['AUTOMATION_RULES'] },
            { plan_id: professional.id, feature_id: fm['AI_CAMPAIGN_CONTENT'] },
            { plan_id: enterprise.id, feature_id: fm['INVENTORY_MANAGEMENT'] },
            { plan_id: enterprise.id, feature_id: fm['APPOINTMENT_CONFIRMATIONS'] },
            { plan_id: enterprise.id, feature_id: fm['SMS_REMINDERS'] },
            { plan_id: enterprise.id, feature_id: fm['WHATSAPP_INTEGRATION'] },
            { plan_id: enterprise.id, feature_id: fm['WHATSAPP_INBOX'] },
            { plan_id: enterprise.id, feature_id: fm['DIGITAL_XRAY'] },
            { plan_id: enterprise.id, feature_id: fm['AI_CLINICAL_NOTES'] },
            { plan_id: enterprise.id, feature_id: fm['AI_PRESCRIPTION'] },
            { plan_id: enterprise.id, feature_id: fm['AI_TREATMENT_PLAN'] },
            { plan_id: enterprise.id, feature_id: fm['AI_CAMPAIGN_CONTENT'] },
            { plan_id: enterprise.id, feature_id: fm['CUSTOM_PROVIDER_CONFIG'] },
            { plan_id: enterprise.id, feature_id: fm['PATIENT_IMPORT'] },
            { plan_id: enterprise.id, feature_id: fm['MARKETING_CAMPAIGNS'] },
            { plan_id: enterprise.id, feature_id: fm['AUTOMATION_RULES'] },
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
        if (created > 0)
            this.logger.log(`Seeded ${created} new plan-feature mappings`);
    }
    async seedTestClinic() {
        const testEmail = 'demo@smiledental.in';
        const existing = await this.prisma.clinic.findFirst({ where: { email: testEmail } });
        if (existing)
            return;
        const professional = await this.prisma.plan.findUnique({ where: { name: 'Professional' } });
        if (!professional)
            return;
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
};
exports.DatabaseSeederService = DatabaseSeederService;
exports.DatabaseSeederService = DatabaseSeederService = DatabaseSeederService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService,
        password_service_js_1.PasswordService])
], DatabaseSeederService);
//# sourceMappingURL=database-seeder.service.js.map