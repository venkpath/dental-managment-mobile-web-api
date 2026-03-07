import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 12;

async function main() {
  // Seed the first super admin
  const superAdminEmail = process.env['SUPER_ADMIN_EMAIL'] || 'admin@dental-saas.com';
  const superAdminPassword = process.env['SUPER_ADMIN_PASSWORD'] || 'Admin@123';
  const superAdminName = process.env['SUPER_ADMIN_NAME'] || 'Platform Admin';

  const existing = await prisma.superAdmin.findUnique({
    where: { email: superAdminEmail },
  });

  if (existing) {
    console.log(`Super admin "${superAdminEmail}" already exists, skipping.`);
  } else {
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

  // Seed default plans for Indian dental SaaS
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
    } else {
      console.log(`Plan "${plan.name}" already exists, skipping.`);
    }
  }

  // Seed default features
  const features = [
    { key: 'AI_PRESCRIPTION', description: 'AI-powered prescription generation' },
    { key: 'AI_TREATMENT_PLAN', description: 'AI-assisted treatment planning' },
    { key: 'SMS_REMINDERS', description: 'SMS appointment reminders' },
    { key: 'WHATSAPP_INTEGRATION', description: 'WhatsApp messaging for patient communication' },
    { key: 'DIGITAL_XRAY', description: 'Digital X-ray management and storage' },
    { key: 'INVENTORY_MANAGEMENT', description: 'Dental inventory and supply tracking' },
  ];

  for (const feature of features) {
    const existingFeature = await prisma.feature.findUnique({ where: { key: feature.key } });
    if (!existingFeature) {
      await prisma.feature.create({ data: feature });
      console.log(`Feature "${feature.key}" created.`);
    } else {
      console.log(`Feature "${feature.key}" already exists, skipping.`);
    }
  }

  // Seed FDI teeth (32 permanent teeth)
  const teethData = [
    // Quadrant 1 – Upper Right
    { fdi_number: 11, name: 'Upper Right Central Incisor', quadrant: 1, position: 1 },
    { fdi_number: 12, name: 'Upper Right Lateral Incisor', quadrant: 1, position: 2 },
    { fdi_number: 13, name: 'Upper Right Canine', quadrant: 1, position: 3 },
    { fdi_number: 14, name: 'Upper Right First Premolar', quadrant: 1, position: 4 },
    { fdi_number: 15, name: 'Upper Right Second Premolar', quadrant: 1, position: 5 },
    { fdi_number: 16, name: 'Upper Right First Molar', quadrant: 1, position: 6 },
    { fdi_number: 17, name: 'Upper Right Second Molar', quadrant: 1, position: 7 },
    { fdi_number: 18, name: 'Upper Right Third Molar', quadrant: 1, position: 8 },
    // Quadrant 2 – Upper Left
    { fdi_number: 21, name: 'Upper Left Central Incisor', quadrant: 2, position: 1 },
    { fdi_number: 22, name: 'Upper Left Lateral Incisor', quadrant: 2, position: 2 },
    { fdi_number: 23, name: 'Upper Left Canine', quadrant: 2, position: 3 },
    { fdi_number: 24, name: 'Upper Left First Premolar', quadrant: 2, position: 4 },
    { fdi_number: 25, name: 'Upper Left Second Premolar', quadrant: 2, position: 5 },
    { fdi_number: 26, name: 'Upper Left First Molar', quadrant: 2, position: 6 },
    { fdi_number: 27, name: 'Upper Left Second Molar', quadrant: 2, position: 7 },
    { fdi_number: 28, name: 'Upper Left Third Molar', quadrant: 2, position: 8 },
    // Quadrant 3 – Lower Left
    { fdi_number: 31, name: 'Lower Left Central Incisor', quadrant: 3, position: 1 },
    { fdi_number: 32, name: 'Lower Left Lateral Incisor', quadrant: 3, position: 2 },
    { fdi_number: 33, name: 'Lower Left Canine', quadrant: 3, position: 3 },
    { fdi_number: 34, name: 'Lower Left First Premolar', quadrant: 3, position: 4 },
    { fdi_number: 35, name: 'Lower Left Second Premolar', quadrant: 3, position: 5 },
    { fdi_number: 36, name: 'Lower Left First Molar', quadrant: 3, position: 6 },
    { fdi_number: 37, name: 'Lower Left Second Molar', quadrant: 3, position: 7 },
    { fdi_number: 38, name: 'Lower Left Third Molar', quadrant: 3, position: 8 },
    // Quadrant 4 – Lower Right
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

  // Seed tooth surfaces
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

  // Seed plan-feature mappings
  const professionalPlan = await prisma.plan.findUnique({ where: { name: 'Professional' } });
  const enterprisePlan = await prisma.plan.findUnique({ where: { name: 'Enterprise' } });
  const starterPlan = await prisma.plan.findUnique({ where: { name: 'Starter' } });
  const allFeatures = await prisma.feature.findMany();

  if (starterPlan && professionalPlan && enterprisePlan && allFeatures.length > 0) {
    const featureMap = Object.fromEntries(allFeatures.map((f) => [f.key, f.id]));

    const planFeatureMappings = [
      // Starter: inventory only
      { plan_id: starterPlan.id, feature_id: featureMap['INVENTORY_MANAGEMENT']!, is_enabled: true },
      // Professional: inventory + SMS + digital xray + AI prescription
      { plan_id: professionalPlan.id, feature_id: featureMap['INVENTORY_MANAGEMENT']!, is_enabled: true },
      { plan_id: professionalPlan.id, feature_id: featureMap['SMS_REMINDERS']!, is_enabled: true },
      { plan_id: professionalPlan.id, feature_id: featureMap['DIGITAL_XRAY']!, is_enabled: true },
      { plan_id: professionalPlan.id, feature_id: featureMap['AI_PRESCRIPTION']!, is_enabled: true },
      // Enterprise: all features
      { plan_id: enterprisePlan.id, feature_id: featureMap['INVENTORY_MANAGEMENT']!, is_enabled: true },
      { plan_id: enterprisePlan.id, feature_id: featureMap['SMS_REMINDERS']!, is_enabled: true },
      { plan_id: enterprisePlan.id, feature_id: featureMap['DIGITAL_XRAY']!, is_enabled: true },
      { plan_id: enterprisePlan.id, feature_id: featureMap['AI_PRESCRIPTION']!, is_enabled: true },
      { plan_id: enterprisePlan.id, feature_id: featureMap['AI_TREATMENT_PLAN']!, is_enabled: true },
      { plan_id: enterprisePlan.id, feature_id: featureMap['WHATSAPP_INTEGRATION']!, is_enabled: true },
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

  // Seed test clinic with branch and users
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
  } else if (existingClinic) {
    console.log(`Test clinic "${testClinicEmail}" already exists, skipping.`);
  }
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
