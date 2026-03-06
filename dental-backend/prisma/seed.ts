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
