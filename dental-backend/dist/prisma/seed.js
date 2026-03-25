"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = __importDefault(require("pg"));
const bcrypt = __importStar(require("bcrypt"));
const pool = new pg_1.default.Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
const SALT_ROUNDS = 12;
async function main() {
    const superAdminEmail = process.env['SUPER_ADMIN_EMAIL'] || 'admin@dental-saas.com';
    const superAdminPassword = process.env['SUPER_ADMIN_PASSWORD'] || 'Admin@123';
    const superAdminName = process.env['SUPER_ADMIN_NAME'] || 'Platform Admin';
    const existing = await prisma.superAdmin.findUnique({
        where: { email: superAdminEmail },
    });
    if (existing) {
        console.log(`Super admin "${superAdminEmail}" already exists, skipping.`);
    }
    else {
        const passwordHash = await bcrypt.hash(superAdminPassword, SALT_ROUNDS);
        await prisma.superAdmin.create({
            data: {
                email: superAdminEmail,
                password_hash: passwordHash,
                name: superAdminName,
            },
        });
        console.log(`Super admin "${superAdminEmail}" created successfully.`);
    }
    const plans = [
        { name: 'Starter', price_monthly: 999, max_branches: 1, max_staff: 5, ai_quota: 0 },
        { name: 'Professional', price_monthly: 2499, max_branches: 3, max_staff: 15, ai_quota: 100 },
        { name: 'Enterprise', price_monthly: 4999, max_branches: 10, max_staff: 50, ai_quota: 500 },
    ];
    for (const plan of plans) {
        const existingPlan = await prisma.plan.findUnique({ where: { name: plan.name } });
        if (!existingPlan) {
            await prisma.plan.create({ data: plan });
            console.log(`Plan "${plan.name}" created.`);
        }
        else {
            console.log(`Plan "${plan.name}" already exists, skipping.`);
        }
    }
    const features = [
        { key: 'AI_PRESCRIPTION', description: 'AI-powered prescription generation' },
        { key: 'AI_TREATMENT_PLAN', description: 'AI-assisted treatment planning' },
        { key: 'SMS_REMINDERS', description: 'SMS appointment reminders' },
        { key: 'WHATSAPP_INTEGRATION', description: 'WhatsApp messaging for patient communication' },
        { key: 'DIGITAL_XRAY', description: 'Digital X-ray management and storage' },
        { key: 'INVENTORY_MANAGEMENT', description: 'Dental inventory and supply tracking' },
        { key: 'CUSTOM_PROVIDER_CONFIG', description: 'Override default email/SMS provider config per clinic' },
    ];
    for (const feature of features) {
        const existingFeature = await prisma.feature.findUnique({ where: { key: feature.key } });
        if (!existingFeature) {
            await prisma.feature.create({ data: feature });
            console.log(`Feature "${feature.key}" created.`);
        }
        else {
            console.log(`Feature "${feature.key}" already exists, skipping.`);
        }
    }
    const teethData = [
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
    for (const tooth of teethData) {
        const existing = await prisma.tooth.findUnique({ where: { fdi_number: tooth.fdi_number } });
        if (!existing) {
            await prisma.tooth.create({ data: tooth });
        }
    }
    console.log(`Seeded ${teethData.length} teeth (FDI numbering).`);
    const surfaces = [
        { name: 'Mesial', code: 'M' },
        { name: 'Distal', code: 'D' },
        { name: 'Buccal', code: 'B' },
        { name: 'Lingual', code: 'L' },
        { name: 'Occlusal', code: 'O' },
    ];
    for (const surface of surfaces) {
        const existing = await prisma.toothSurface.findUnique({ where: { name: surface.name } });
        if (!existing) {
            await prisma.toothSurface.create({ data: surface });
        }
    }
    console.log(`Seeded ${surfaces.length} tooth surfaces.`);
    const professionalPlan = await prisma.plan.findUnique({ where: { name: 'Professional' } });
    const enterprisePlan = await prisma.plan.findUnique({ where: { name: 'Enterprise' } });
    const starterPlan = await prisma.plan.findUnique({ where: { name: 'Starter' } });
    const allFeatures = await prisma.feature.findMany();
    if (starterPlan && professionalPlan && enterprisePlan && allFeatures.length > 0) {
        const featureMap = Object.fromEntries(allFeatures.map((f) => [f.key, f.id]));
        const planFeatureMappings = [
            { plan_id: starterPlan.id, feature_id: featureMap['INVENTORY_MANAGEMENT'], is_enabled: true },
            { plan_id: professionalPlan.id, feature_id: featureMap['INVENTORY_MANAGEMENT'], is_enabled: true },
            { plan_id: professionalPlan.id, feature_id: featureMap['SMS_REMINDERS'], is_enabled: true },
            { plan_id: professionalPlan.id, feature_id: featureMap['DIGITAL_XRAY'], is_enabled: true },
            { plan_id: professionalPlan.id, feature_id: featureMap['AI_PRESCRIPTION'], is_enabled: true },
            { plan_id: professionalPlan.id, feature_id: featureMap['CUSTOM_PROVIDER_CONFIG'], is_enabled: true },
            { plan_id: enterprisePlan.id, feature_id: featureMap['INVENTORY_MANAGEMENT'], is_enabled: true },
            { plan_id: enterprisePlan.id, feature_id: featureMap['SMS_REMINDERS'], is_enabled: true },
            { plan_id: enterprisePlan.id, feature_id: featureMap['DIGITAL_XRAY'], is_enabled: true },
            { plan_id: enterprisePlan.id, feature_id: featureMap['AI_PRESCRIPTION'], is_enabled: true },
            { plan_id: enterprisePlan.id, feature_id: featureMap['AI_TREATMENT_PLAN'], is_enabled: true },
            { plan_id: enterprisePlan.id, feature_id: featureMap['WHATSAPP_INTEGRATION'], is_enabled: true },
            { plan_id: enterprisePlan.id, feature_id: featureMap['CUSTOM_PROVIDER_CONFIG'], is_enabled: true },
        ];
        for (const mapping of planFeatureMappings) {
            const existing = await prisma.planFeature.findUnique({
                where: { plan_id_feature_id: { plan_id: mapping.plan_id, feature_id: mapping.feature_id } },
            });
            if (!existing) {
                await prisma.planFeature.create({ data: mapping });
            }
        }
        console.log('Seeded plan-feature mappings.');
    }
    const testClinicEmail = 'demo@smiledental.in';
    const existingClinic = await prisma.clinic.findFirst({ where: { email: testClinicEmail } });
    if (!existingClinic && professionalPlan) {
        const clinic = await prisma.clinic.create({
            data: {
                name: 'Smile Dental Clinic',
                email: testClinicEmail,
                phone: '+91-9876543210',
                address: '42 MG Road, Indiranagar',
                city: 'Bangalore',
                state: 'Karnataka',
                country: 'India',
                plan_id: professionalPlan.id,
                subscription_status: 'active',
                trial_ends_at: null,
            },
        });
        console.log(`Test clinic "${clinic.name}" created.`);
        const branch = await prisma.branch.create({
            data: {
                clinic_id: clinic.id,
                name: 'Main Branch',
                phone: '+91-9876543210',
                address: '42 MG Road, Indiranagar',
                city: 'Bangalore',
                state: 'Karnataka',
            },
        });
        console.log(`Test branch "${branch.name}" created.`);
        const testUsers = [
            { name: 'Dr. Priya Sharma', email: 'priya@smiledental.in', role: 'admin', password: 'Admin@123' },
            { name: 'Dr. Rahul Verma', email: 'rahul@smiledental.in', role: 'dentist', password: 'Dentist@123' },
            { name: 'Dr. Anjali Patel', email: 'anjali@smiledental.in', role: 'dentist', password: 'Dentist@123' },
            { name: 'Meera Nair', email: 'meera@smiledental.in', role: 'receptionist', password: 'Reception@123' },
            { name: 'Suresh Kumar', email: 'suresh@smiledental.in', role: 'staff', password: 'Staff@123' },
        ];
        for (const user of testUsers) {
            const passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);
            await prisma.user.create({
                data: {
                    clinic_id: clinic.id,
                    branch_id: branch.id,
                    name: user.name,
                    email: user.email,
                    password_hash: passwordHash,
                    role: user.role,
                    status: 'active',
                },
            });
            console.log(`Test user "${user.name}" (${user.role}) created.`);
        }
    }
    else if (existingClinic) {
        console.log(`Test clinic "${testClinicEmail}" already exists, skipping.`);
    }
    await seedCommunicationTemplates(prisma);
}
async function seedCommunicationTemplates(prismaClient) {
    const templates = [
        { channel: 'all', category: 'reminder', template_name: 'Appointment Reminder - 24hr', subject: 'Reminder: Your appointment is tomorrow', body: 'Hi {{patient_name}}, this is a reminder that you have an appointment tomorrow ({{appointment_date}}) at {{appointment_time}} with {{dentist_name}} at {{clinic_name}}. Please arrive 10 minutes early. Call us at {{clinic_phone}} to reschedule.', variables: ['patient_name', 'appointment_date', 'appointment_time', 'dentist_name', 'clinic_name', 'clinic_phone'] },
        { channel: 'all', category: 'reminder', template_name: 'Appointment Reminder - 2hr', subject: 'Your appointment is in 2 hours', body: 'Hi {{patient_name}}, your appointment with {{dentist_name}} is in 2 hours at {{appointment_time}}. See you soon at {{clinic_name}}!', variables: ['patient_name', 'dentist_name', 'appointment_time', 'clinic_name'] },
        { channel: 'all', category: 'reminder', template_name: 'Installment Due Reminder', subject: 'Payment reminder: Installment due soon', body: 'Hi {{patient_name}}, a friendly reminder that your installment of Rs.{{amount}} is due on {{due_date}}. Please visit {{clinic_name}} or contact us at {{clinic_phone}}.', variables: ['patient_name', 'amount', 'due_date', 'clinic_name', 'clinic_phone'] },
        { channel: 'all', category: 'transactional', template_name: 'Payment Confirmation', subject: 'Payment received — Thank you!', body: 'Hi {{patient_name}}, we have received your payment of Rs.{{amount}}. Thank you for choosing {{clinic_name}}!', variables: ['patient_name', 'amount', 'clinic_name'] },
        { channel: 'all', category: 'greeting', template_name: 'Birthday Greeting', subject: 'Happy Birthday, {{patient_name}}!', body: 'Happy Birthday, {{patient_name}}! Wishing you a wonderful day filled with smiles. Enjoy a special offer on your next visit to {{clinic_name}}! Call us at {{clinic_phone}} to book.', variables: ['patient_name', 'clinic_name', 'clinic_phone'] },
        { channel: 'all', category: 'greeting', template_name: 'Festival Greeting', subject: 'Happy {{festival_name}} from {{clinic_name}}!', body: 'Dear {{patient_name}}, wishing you and your family a very Happy {{festival_name}}! May this occasion bring joy and good health. — Team {{clinic_name}}', variables: ['patient_name', 'festival_name', 'clinic_name'] },
        { channel: 'all', category: 'follow_up', template_name: 'Post-Visit Feedback Request', subject: 'How was your visit?', body: 'Hi {{patient_name}}, thank you for visiting {{clinic_name}} today! We would love to hear about your experience. Please rate us on a scale of 1-5 stars.', variables: ['patient_name', 'clinic_name'] },
        { channel: 'all', category: 'follow_up', template_name: 'No-Show Follow-Up', subject: 'We missed you today!', body: 'Hi {{patient_name}}, we noticed you missed your appointment today. Would you like to reschedule? Call us at {{clinic_phone}}. — {{clinic_name}}', variables: ['patient_name', 'clinic_phone', 'clinic_name'] },
        { channel: 'all', category: 'follow_up', template_name: 'Post-Treatment Care - Extraction', subject: 'Care instructions after extraction', body: 'Hi {{patient_name}}, post-extraction care: Bite gauze 30 min, no spitting/rinsing 24hr, avoid hot food, take prescribed meds, ice pack 15 min on/off. Call {{clinic_phone}} if needed.', variables: ['patient_name', 'clinic_phone'] },
        { channel: 'all', category: 'follow_up', template_name: 'Post-Treatment Care - RCT', subject: 'Care instructions after root canal', body: 'Hi {{patient_name}}, post-RCT care: Avoid chewing on treated side 48hr, take prescribed meds, get crown within 2-4 weeks. Call {{clinic_phone}} if pain increases.', variables: ['patient_name', 'clinic_phone'] },
        { channel: 'all', category: 'campaign', template_name: 'Reactivation - Gentle Reminder', subject: 'We miss you!', body: 'Hi {{patient_name}}, it has been a while since your last visit to {{clinic_name}}. Regular check-ups help catch problems early. Call {{clinic_phone}} to book!', variables: ['patient_name', 'clinic_name', 'clinic_phone'] },
        { channel: 'all', category: 'referral', template_name: 'Referral Invitation', subject: 'Refer a friend!', body: 'Hi {{patient_name}}, refer a friend to {{clinic_name}} and both of you get {{reward}}! Share code: {{referral_code}}', variables: ['patient_name', 'clinic_name', 'reward', 'referral_code'] },
        { channel: 'email', category: 'transactional', template_name: 'Email Verification', subject: 'Verify your email', body: 'Hi {{user_name}}, please verify your email: {{verification_link}}. Expires in 24 hours.', variables: ['user_name', 'verification_link'] },
        { channel: 'email', category: 'transactional', template_name: 'Password Reset', subject: 'Reset your password', body: 'Hi {{user_name}}, reset your password: {{reset_link}}. Expires in 1 hour.', variables: ['user_name', 'reset_link'] },
        { channel: 'all', category: 'transactional', template_name: 'OTP Verification', subject: 'Your OTP code', body: 'Your verification code is: {{otp_code}}. Expires in 10 minutes. Do not share.', variables: ['otp_code'] },
    ];
    let created = 0;
    for (const t of templates) {
        const exists = await prismaClient.messageTemplate.findFirst({
            where: { clinic_id: null, template_name: t.template_name, language: 'en' },
        });
        if (!exists) {
            await prismaClient.messageTemplate.create({
                data: { ...t, clinic_id: null, language: 'en', is_active: true },
            });
            created++;
        }
    }
    console.log(`Seeded ${created} default communication templates (${templates.length - created} already existed).`);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
});
//# sourceMappingURL=seed.js.map