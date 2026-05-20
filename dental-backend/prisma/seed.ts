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

  // Seed default plans for Indian dental SaaS.
  // whatsapp_included_monthly: messages/month bundled into the plan price.
  // whatsapp_hard_limit_monthly: hard cap — further WA sends are blocked. null = no block (overage allowed).
  // allow_whatsapp_overage_billing: true = overage tracked for post-hoc billing via payment link.
  const plans = [
    { name: 'Free',                price_monthly: 0,     price_yearly: 0,     max_branches: 1,  max_staff: 2,  ai_quota: 5,  ai_overage_cap: 0,   max_patients_per_month: 10,   max_appointments_per_month: 10,   max_invoices_per_month: 10,   max_treatments_per_month: 10,   max_prescriptions_per_month: 10,   max_consultations_per_month: 10,   whatsapp_included_monthly: 20,  whatsapp_hard_limit_monthly: 20,  allow_whatsapp_overage_billing: false },
    { name: 'Starter',             price_monthly: 999,   price_yearly: 9990,  max_branches: 1,  max_staff: 5,  ai_quota: 15, ai_overage_cap: 50,  max_patients_per_month: null, max_appointments_per_month: null, whatsapp_included_monthly: 200, whatsapp_hard_limit_monthly: 200, allow_whatsapp_overage_billing: false },
    { name: 'Professional',        price_monthly: 1999,  price_yearly: 19990, max_branches: 3,  max_staff: 15, ai_quota: 25, ai_overage_cap: 75,  max_patients_per_month: null, max_appointments_per_month: null, whatsapp_included_monthly: 400, whatsapp_hard_limit_monthly: 400, allow_whatsapp_overage_billing: false },
    { name: 'Enterprise',          price_monthly: 2999,  price_yearly: 29990, max_branches: 10, max_staff: 50, ai_quota: 50, ai_overage_cap: 100, max_patients_per_month: null, max_appointments_per_month: null, whatsapp_included_monthly: 500, whatsapp_hard_limit_monthly: 500, allow_whatsapp_overage_billing: true },
    // Yearly billing variants — price_monthly is the annual lump-sum charged per Razorpay cycle.
    // Same limits and features as their monthly counterparts.
    { name: 'Starter Yearly',      price_monthly: 9990,  price_yearly: 9990,  max_branches: 1,  max_staff: 5,  ai_quota: 15, ai_overage_cap: 50,  max_patients_per_month: null, max_appointments_per_month: null, whatsapp_included_monthly: 200, whatsapp_hard_limit_monthly: 200, allow_whatsapp_overage_billing: false },
    { name: 'Professional Yearly', price_monthly: 19990, price_yearly: 19990, max_branches: 3,  max_staff: 15, ai_quota: 25, ai_overage_cap: 75,  max_patients_per_month: null, max_appointments_per_month: null, whatsapp_included_monthly: 400, whatsapp_hard_limit_monthly: 400, allow_whatsapp_overage_billing: false },
    { name: 'Enterprise Yearly',   price_monthly: 29990, price_yearly: 29990, max_branches: 10, max_staff: 50, ai_quota: 50, ai_overage_cap: 100, max_patients_per_month: null, max_appointments_per_month: null, whatsapp_included_monthly: 500, whatsapp_hard_limit_monthly: 500, allow_whatsapp_overage_billing: true },
  ];

  for (const plan of plans) {
    const { name, ...data } = plan;
    await prisma.plan.upsert({
      where: { name },
      create: { name, ...data },
      update: data,
    });
    console.log(`Plan "${name}" upserted.`);
  }

  // Seed default features
  const features = [
    { key: 'AI_CLINICAL_NOTES', description: 'AI-generated SOAP clinical notes' },
    { key: 'AI_PRESCRIPTION', description: 'AI-powered prescription generation' },
    { key: 'AI_TREATMENT_PLAN', description: 'AI-assisted treatment planning' },
    { key: 'AI_CAMPAIGN_CONTENT', description: 'AI-powered campaign message generation with A/B variants' },
    { key: 'AI_CONSENT_FORM', description: 'AI-generated multi-language consent form templates' },
    { key: 'SMS_REMINDERS', description: 'SMS appointment reminders' },
    { key: 'WHATSAPP_INTEGRATION', description: 'WhatsApp messaging for patient communication' },
    { key: 'WHATSAPP_INBOX', description: 'WhatsApp inbox — receive and reply to patient messages (requires own WABA)' },
    { key: 'DIGITAL_XRAY', description: 'Digital X-ray management and storage' },
    { key: 'INVENTORY_MANAGEMENT', description: 'Dental inventory and supply tracking' },
    { key: 'CUSTOM_PROVIDER_CONFIG', description: 'Override default email/SMS provider config per clinic' },
    { key: 'PATIENT_IMPORT', description: 'Bulk patient import from CSV/Excel and AI image extraction' },
    { key: 'MARKETING_CAMPAIGNS', description: 'Bulk marketing campaigns (SMS/Email/WhatsApp) with segmentation, A/B tests, drip sequences' },
    { key: 'AUTOMATION_RULES', description: 'Automation rules — birthday greetings, reactivation, payment reminders, post-visit follow-ups' },
    { key: 'APPOINTMENT_CONFIRMATIONS', description: 'Automated appointment confirmation messages to patients' },
    { key: 'CUSTOM_TEMPLATES', description: 'Create, edit, delete, and submit your own WhatsApp/SMS/email templates (system templates remain read-only for everyone)' },
    { key: 'AI_PATIENT_INSIGHTS', description: 'AI-powered patient risk scoring: no-show prediction, recall due, churn risk, treatment conversion opportunities' },
    { key: 'INSURANCE_MODULE', description: 'Insurance & EHS empanelment, eligibility checks, coverage-aware invoicing, and claim management (CGHS, ECHS, state EHS, private insurers)' },
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
  const freePlan = await prisma.plan.findUnique({ where: { name: 'Free' } });
  const starterPlan = await prisma.plan.findUnique({ where: { name: 'Starter' } });
  const professionalPlan = await prisma.plan.findUnique({ where: { name: 'Professional' } });
  const enterprisePlan = await prisma.plan.findUnique({ where: { name: 'Enterprise' } });
  const starterYearlyPlan = await prisma.plan.findUnique({ where: { name: 'Starter Yearly' } });
  const professionalYearlyPlan = await prisma.plan.findUnique({ where: { name: 'Professional Yearly' } });
  const enterpriseYearlyPlan = await prisma.plan.findUnique({ where: { name: 'Enterprise Yearly' } });
  const allFeatures = await prisma.feature.findMany();

  if (freePlan && starterPlan && professionalPlan && enterprisePlan && starterYearlyPlan && professionalYearlyPlan && enterpriseYearlyPlan && allFeatures.length > 0) {
    const featureMap = Object.fromEntries(allFeatures.map((f) => [f.key, f.id]));

    // Helper to build feature rows for a plan
    const planFeatures = (planId: string, keys: string[]) =>
      keys.map((key) => ({ plan_id: planId, feature_id: featureMap[key]!, is_enabled: true }));

    // Opt-in plan-features: the plan supports the feature but it ships with
    // is_enabled=false so the clinic admin must explicitly turn it on in
    // settings (which creates a ClinicFeatureOverride.is_enabled=true). Free
    // and Starter plans don't get the row at all, so they see an upgrade
    // prompt instead of an enable-in-settings toggle.
    const planFeaturesOptIn = (planId: string, keys: string[]) =>
      keys.map((key) => ({ plan_id: planId, feature_id: featureMap[key]!, is_enabled: false }));

    const STARTER_FEATURES = ['INVENTORY_MANAGEMENT', 'APPOINTMENT_CONFIRMATIONS', 'SMS_REMINDERS', 'WHATSAPP_INTEGRATION', 'AI_CLINICAL_NOTES', 'AI_PRESCRIPTION', 'AI_TREATMENT_PLAN', 'AI_CAMPAIGN_CONTENT', 'AI_CONSENT_FORM'];
    const PROFESSIONAL_FEATURES = ['INVENTORY_MANAGEMENT', 'APPOINTMENT_CONFIRMATIONS', 'SMS_REMINDERS', 'WHATSAPP_INTEGRATION', 'DIGITAL_XRAY', 'AI_CLINICAL_NOTES', 'AI_PRESCRIPTION', 'AI_TREATMENT_PLAN', 'AI_CAMPAIGN_CONTENT', 'AI_CONSENT_FORM', 'CUSTOM_PROVIDER_CONFIG', 'PATIENT_IMPORT', 'MARKETING_CAMPAIGNS', 'AUTOMATION_RULES', 'AI_PATIENT_INSIGHTS'];
    const ENTERPRISE_FEATURES = [...PROFESSIONAL_FEATURES, 'WHATSAPP_INBOX', 'CUSTOM_TEMPLATES'];
    // Available on Professional+ but ship as opt-in (admin must enable in settings).
    const OPT_IN_PROFESSIONAL_FEATURES = ['INSURANCE_MODULE'];

    const planFeatureMappings = [
      // Free
      ...planFeatures(freePlan.id, ['INVENTORY_MANAGEMENT', 'AI_CLINICAL_NOTES', 'AI_PRESCRIPTION', 'AI_TREATMENT_PLAN', 'AI_CAMPAIGN_CONTENT', 'AI_CONSENT_FORM', 'APPOINTMENT_CONFIRMATIONS', 'DIGITAL_XRAY', 'PATIENT_IMPORT', 'CUSTOM_PROVIDER_CONFIG', 'WHATSAPP_INTEGRATION']),
      // Monthly plans
      ...planFeatures(starterPlan.id, STARTER_FEATURES),
      ...planFeatures(professionalPlan.id, PROFESSIONAL_FEATURES),
      ...planFeatures(enterprisePlan.id, ENTERPRISE_FEATURES),
      // Opt-in features for Professional+: plan supports it but disabled by default
      ...planFeaturesOptIn(professionalPlan.id, OPT_IN_PROFESSIONAL_FEATURES),
      ...planFeaturesOptIn(enterprisePlan.id, OPT_IN_PROFESSIONAL_FEATURES),
      // Yearly plans — identical feature sets to their monthly counterparts
      ...planFeatures(starterYearlyPlan.id, STARTER_FEATURES),
      ...planFeatures(professionalYearlyPlan.id, PROFESSIONAL_FEATURES),
      ...planFeatures(enterpriseYearlyPlan.id, ENTERPRISE_FEATURES),
      ...planFeaturesOptIn(professionalYearlyPlan.id, OPT_IN_PROFESSIONAL_FEATURES),
      ...planFeaturesOptIn(enterpriseYearlyPlan.id, OPT_IN_PROFESSIONAL_FEATURES),
    ];

    for (const mapping of planFeatureMappings) {
      await prisma.planFeature.upsert({
        where: { plan_id_feature_id: { plan_id: mapping.plan_id, feature_id: mapping.feature_id } },
        create: mapping,
        update: { is_enabled: mapping.is_enabled },
      });
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

  // Seed default communication templates
  await seedCommunicationTemplates(prisma);

  // Seed default insurance providers + sample plans (Phase 7)
  await seedInsuranceProviders(prisma);

  // Seed the official AP EHS (Dr. NTR Vaidya Seva Trust) dental rate card
  // — gives the coverage engine real scheme_max_fee values so CGHS-style
  // billing produces accurate insurance vs patient splits.
  await seedApEhsDentalRateCard(prisma);
}

async function seedCommunicationTemplates(prismaClient: typeof prisma) {
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

// ─── Insurance & EHS providers seeding ─────────────────────────────────
// Global (clinic_id = null) so every clinic sees the catalogue. India is
// seeded first; USA / Canada providers go behind country filters when those
// markets go live. Each provider gets one starter plan so the UI has
// something selectable end-to-end on day one.
async function seedInsuranceProviders(prismaClient: typeof prisma) {
  type SeedProvider = {
    short_code: string;
    name: string;
    type: string;
    country: string;
    claim_method: string;
    tpa_name?: string;
    website?: string;
    notes?: string;
    plans: Array<{
      plan_name: string;
      plan_code?: string;
      preventive_coverage?: number;
      basic_coverage?: number;
      major_coverage?: number;
      ortho_coverage?: number;
      annual_max_amount?: number | null;
      deductible_amount?: number;
      requires_preauth?: boolean;
      requires_referral?: boolean;
      coverage_rules?: Record<string, unknown>;
    }>;
  };

  const providers: SeedProvider[] = [
    // ─── India — Government EHS ────────────────────────────────────────
    {
      short_code: 'CGHS',
      name: 'Central Government Health Scheme',
      type: 'EHS_GOVERNMENT',
      country: 'IN',
      claim_method: 'PHYSICAL',
      website: 'https://cghs.gov.in',
      notes: 'For central govt employees, pensioners and dependents. Bills at CGHS rate schedule; patient co-pay typically nil for pensioners.',
      plans: [{
        plan_name: 'CGHS — Standard',
        plan_code: 'CGHS-STD',
        preventive_coverage: 100, basic_coverage: 100, major_coverage: 100, ortho_coverage: 0,
        annual_max_amount: null, deductible_amount: 0,
        requires_preauth: true, requires_referral: true,
        coverage_rules: { uses_cghs_rates: true, rate_card_version: '2024', preauth_threshold_inr: 5000 },
      }],
    },
    {
      short_code: 'ECHS',
      name: 'Ex-Servicemen Contributory Health Scheme',
      type: 'EHS_GOVERNMENT',
      country: 'IN',
      claim_method: 'PHYSICAL',
      website: 'https://echs.gov.in',
      notes: 'For ex-servicemen and dependents. Polyclinic referral required for most dental work at empanelled clinics.',
      plans: [{
        plan_name: 'ECHS — Standard',
        plan_code: 'ECHS-STD',
        preventive_coverage: 100, basic_coverage: 100, major_coverage: 100,
        annual_max_amount: null, deductible_amount: 0,
        requires_preauth: true, requires_referral: true,
        coverage_rules: { uses_cghs_rates: true, polyclinic_referral_required: true },
      }],
    },
    {
      short_code: 'ESI',
      name: 'Employees State Insurance Scheme',
      type: 'EHS_GOVERNMENT',
      country: 'IN',
      claim_method: 'PHYSICAL',
      website: 'https://esic.gov.in',
      notes: 'For factory/industrial workers earning up to Rs. 21,000/month. Limited dental coverage — primarily extractions and emergency care.',
      plans: [{
        plan_name: 'ESI — Standard',
        plan_code: 'ESI-STD',
        preventive_coverage: 100, basic_coverage: 80, major_coverage: 30, ortho_coverage: 0,
        annual_max_amount: 25000, deductible_amount: 0,
        requires_preauth: false, requires_referral: true,
        coverage_rules: { dispensary_referral_required: true },
      }],
    },
    {
      short_code: 'AYUSHMAN',
      name: 'Ayushman Bharat (PM-JAY)',
      type: 'NATIONAL_PLAN',
      country: 'IN',
      claim_method: 'ONLINE_PORTAL',
      website: 'https://pmjay.gov.in',
      notes: 'National Health Protection scheme for low-income families. Dental coverage is minimal — mostly trauma/emergency.',
      plans: [{
        plan_name: 'PM-JAY Standard',
        plan_code: 'PMJAY-STD',
        preventive_coverage: 0, basic_coverage: 50, major_coverage: 30, ortho_coverage: 0,
        annual_max_amount: 500000, deductible_amount: 0,
        requires_preauth: true, requires_referral: false,
        coverage_rules: { family_floater: true, hospital_admission_required_for_most: true },
      }],
    },

    // ─── India — State Government EHS schemes ──────────────────────────
    // State EHS schemes are administered by state trusts (e.g. Andhra Pradesh
    // by Dr. YSR Aarogyasri Health Care Trust). They bill at package rates
    // at empanelled hospitals, require a beneficiary card with a Welfare
    // Benefit Number (WBN), and are usually referral-driven.
    {
      short_code: 'AP_EHS',
      name: 'Andhra Pradesh Employees Health Scheme',
      type: 'EHS_GOVERNMENT',
      country: 'IN',
      claim_method: 'ONLINE_PORTAL',
      website: 'https://drntrvaidyaseva.ap.gov.in/ehs',
      notes: 'For AP state govt employees, pensioners, journalists, AIS officers serving in AP, and dependents. Cashless at empanelled hospitals; needs WBN beneficiary ID. Administered by Dr. NTR Vaidya Seva Trust. Empanelment portal: https://www.ehs.ap.gov.in/EmpanelmentsAP/login.htm',
      plans: [{
        plan_name: 'AP EHS — Standard',
        plan_code: 'APEHS-STD',
        preventive_coverage: 100, basic_coverage: 100, major_coverage: 100, ortho_coverage: 0,
        annual_max_amount: null, deductible_amount: 0,
        requires_preauth: true, requires_referral: true,
        coverage_rules: { uses_cghs_rates: true, state: 'AP', card_id_label: 'WBN (Welfare Benefit Number)', referral_required: true, package_rate_based: true },
      }],
    },
    {
      short_code: 'TS_EHS',
      name: 'Telangana State Employees Health Scheme',
      type: 'EHS_GOVERNMENT',
      country: 'IN',
      claim_method: 'ONLINE_PORTAL',
      notes: 'For Telangana state govt employees, pensioners, journalists and dependents. Successor to undivided AP EHS post 2014 state bifurcation. Cashless at empanelled hospitals.',
      plans: [{
        plan_name: 'TS EHS — Standard',
        plan_code: 'TSEHS-STD',
        preventive_coverage: 100, basic_coverage: 100, major_coverage: 100,
        annual_max_amount: null, deductible_amount: 0,
        requires_preauth: true, requires_referral: true,
        coverage_rules: { uses_cghs_rates: true, state: 'TS', card_id_label: 'WBN', package_rate_based: true },
      }],
    },
    {
      short_code: 'TN_CMCHIS',
      name: 'Chief Minister\'s Comprehensive Health Insurance Scheme (Tamil Nadu)',
      type: 'EHS_GOVERNMENT',
      country: 'IN',
      claim_method: 'ONLINE_PORTAL',
      notes: 'Tamil Nadu state scheme covering govt employees + low-income families. Administered by United India Insurance on behalf of the TN govt.',
      plans: [{
        plan_name: 'TN CMCHIS — Standard',
        plan_code: 'TNCMCHIS-STD',
        preventive_coverage: 100, basic_coverage: 100, major_coverage: 100,
        annual_max_amount: 500000, deductible_amount: 0,
        requires_preauth: true, requires_referral: true,
        coverage_rules: { uses_cghs_rates: true, state: 'TN', package_rate_based: true },
      }],
    },
    {
      short_code: 'KA_KSGEHIS',
      name: 'Karnataka State Govt Employees Health Insurance Scheme',
      type: 'EHS_GOVERNMENT',
      country: 'IN',
      claim_method: 'ONLINE_PORTAL',
      notes: 'Karnataka state employees + pensioners. Cashless at empanelled hospitals.',
      plans: [{
        plan_name: 'KA KSGEHIS — Standard',
        plan_code: 'KAKSGEHIS-STD',
        preventive_coverage: 100, basic_coverage: 100, major_coverage: 100,
        annual_max_amount: null, deductible_amount: 0,
        requires_preauth: true, requires_referral: true,
        coverage_rules: { uses_cghs_rates: true, state: 'KA', package_rate_based: true },
      }],
    },
    {
      short_code: 'RJ_RGHS',
      name: 'Rajasthan Government Health Scheme',
      type: 'EHS_GOVERNMENT',
      country: 'IN',
      claim_method: 'ONLINE_PORTAL',
      notes: 'Rajasthan state employees, pensioners, MLAs and dependents.',
      plans: [{
        plan_name: 'RJ RGHS — Standard',
        plan_code: 'RJRGHS-STD',
        preventive_coverage: 100, basic_coverage: 100, major_coverage: 100,
        annual_max_amount: null, deductible_amount: 0,
        requires_preauth: true, requires_referral: true,
        coverage_rules: { uses_cghs_rates: true, state: 'RJ', package_rate_based: true },
      }],
    },
    {
      short_code: 'DL_DGEHS',
      name: 'Delhi Government Employees Health Scheme',
      type: 'EHS_GOVERNMENT',
      country: 'IN',
      claim_method: 'PHYSICAL',
      notes: 'Delhi GNCT employees and dependents. Empanelled hospitals + dispensaries.',
      plans: [{
        plan_name: 'DL DGEHS — Standard',
        plan_code: 'DLDGEHS-STD',
        preventive_coverage: 100, basic_coverage: 100, major_coverage: 100,
        annual_max_amount: null, deductible_amount: 0,
        requires_preauth: true, requires_referral: true,
        coverage_rules: { uses_cghs_rates: true, state: 'DL', package_rate_based: true },
      }],
    },
    {
      short_code: 'MH_MJPJAY',
      name: 'Maharashtra Jan Arogya Yojana',
      type: 'EHS_GOVERNMENT',
      country: 'IN',
      claim_method: 'ONLINE_PORTAL',
      notes: 'Maharashtra state scheme. Cashless treatment at empanelled hospitals for listed packages.',
      plans: [{
        plan_name: 'MH Jan Arogya — Standard',
        plan_code: 'MHJAY-STD',
        preventive_coverage: 100, basic_coverage: 100, major_coverage: 100,
        annual_max_amount: 500000, deductible_amount: 0,
        requires_preauth: true, requires_referral: false,
        coverage_rules: { uses_cghs_rates: true, state: 'MH', package_rate_based: true, family_floater: true },
      }],
    },
    {
      short_code: 'WB_SS',
      name: 'Swasthya Sathi (West Bengal)',
      type: 'EHS_GOVERNMENT',
      country: 'IN',
      claim_method: 'ONLINE_PORTAL',
      notes: 'West Bengal universal health scheme — covers most residents not under ESI/CGHS. Smart-card based.',
      plans: [{
        plan_name: 'WB Swasthya Sathi — Standard',
        plan_code: 'WBSS-STD',
        preventive_coverage: 100, basic_coverage: 100, major_coverage: 100,
        annual_max_amount: 500000, deductible_amount: 0,
        requires_preauth: true, requires_referral: false,
        coverage_rules: { uses_cghs_rates: true, state: 'WB', package_rate_based: true, family_floater: true, smart_card: true },
      }],
    },
    {
      short_code: 'KL_KASP',
      name: 'Karunya Arogya Suraksha Padhathi (Kerala)',
      type: 'EHS_GOVERNMENT',
      country: 'IN',
      claim_method: 'ONLINE_PORTAL',
      notes: 'Kerala state health scheme. Administered by State Health Agency. Often integrated with PM-JAY.',
      plans: [{
        plan_name: 'KL KASP — Standard',
        plan_code: 'KLKASP-STD',
        preventive_coverage: 100, basic_coverage: 100, major_coverage: 100,
        annual_max_amount: 500000, deductible_amount: 0,
        requires_preauth: true, requires_referral: false,
        coverage_rules: { uses_cghs_rates: true, state: 'KL', package_rate_based: true, family_floater: true },
      }],
    },

    // ─── India — Private Group / Health Insurance ──────────────────────
    {
      short_code: 'STAR_HEALTH',
      name: 'Star Health and Allied Insurance',
      type: 'GROUP_INSURANCE',
      country: 'IN',
      claim_method: 'ONLINE_PORTAL',
      website: 'https://starhealth.in',
      notes: 'Largest standalone health insurer in India. Dental usually as an add-on rider on health policies.',
      plans: [
        {
          plan_name: 'Star Comprehensive — Dental Rider',
          plan_code: 'STAR-COMP-DEN',
          preventive_coverage: 100, basic_coverage: 80, major_coverage: 50, ortho_coverage: 0,
          annual_max_amount: 10000, deductible_amount: 0,
          requires_preauth: true,
        },
      ],
    },
    {
      short_code: 'HDFC_ERGO',
      name: 'HDFC ERGO General Insurance',
      type: 'GROUP_INSURANCE',
      country: 'IN',
      claim_method: 'ONLINE_PORTAL',
      website: 'https://hdfcergo.com',
      plans: [{
        plan_name: 'my:health Suraksha — Dental Add-on',
        plan_code: 'HDFCERGO-MHS-DEN',
        preventive_coverage: 100, basic_coverage: 80, major_coverage: 50,
        annual_max_amount: 15000, deductible_amount: 500,
        requires_preauth: true,
      }],
    },
    {
      short_code: 'NIVA_BUPA',
      name: 'Niva Bupa Health Insurance',
      type: 'GROUP_INSURANCE',
      country: 'IN',
      claim_method: 'ONLINE_PORTAL',
      website: 'https://nivabupa.com',
      plans: [{
        plan_name: 'ReAssure — Dental Add-on',
        plan_code: 'NIVA-REA-DEN',
        preventive_coverage: 100, basic_coverage: 75, major_coverage: 50,
        annual_max_amount: 20000, deductible_amount: 500,
        requires_preauth: true,
      }],
    },
    {
      short_code: 'CARE',
      name: 'Care Health Insurance',
      type: 'GROUP_INSURANCE',
      country: 'IN',
      claim_method: 'ONLINE_PORTAL',
      website: 'https://careinsurance.com',
      plans: [{
        plan_name: 'Care Plus — Dental Cover',
        plan_code: 'CARE-PLUS-DEN',
        preventive_coverage: 100, basic_coverage: 75, major_coverage: 50,
        annual_max_amount: 10000, deductible_amount: 0,
        requires_preauth: true,
      }],
    },

    // ─── India — Corporate EHS via TPA (placeholder; clinics add their own) ─
    {
      short_code: 'VIDAL_TPA',
      name: 'Vidal Health TPA',
      type: 'TPA',
      country: 'IN',
      claim_method: 'TPA',
      tpa_name: 'Vidal Health Insurance TPA',
      website: 'https://vidalhealthtpa.com',
      notes: 'Third-party administrator handling corporate group health policies (Infosys, TCS, Wipro, etc.).',
      plans: [{
        plan_name: 'Vidal Corporate Group — Generic',
        plan_code: 'VIDAL-CORP-GEN',
        preventive_coverage: 100, basic_coverage: 80, major_coverage: 50,
        annual_max_amount: 25000, deductible_amount: 0,
        requires_preauth: true,
      }],
    },

    // ─── Canada ────────────────────────────────────────────────────────
    {
      short_code: 'CDCP',
      name: 'Canadian Dental Care Plan',
      type: 'NATIONAL_PLAN',
      country: 'CA',
      claim_method: 'ONLINE_PORTAL',
      website: 'https://canada.ca/en/services/benefits/dental.html',
      notes: 'Federal dental plan for low/middle-income Canadians; administered by Sun Life on behalf of the government.',
      plans: [{
        plan_name: 'CDCP — Standard',
        plan_code: 'CDCP-STD',
        preventive_coverage: 100, basic_coverage: 80, major_coverage: 50,
        annual_max_amount: null, deductible_amount: 0,
        requires_preauth: true,
        coverage_rules: { currency: 'CAD', household_income_based: true },
      }],
    },
    {
      short_code: 'SUNLIFE_CA',
      name: 'Sun Life Financial (Canada)',
      type: 'GROUP_INSURANCE',
      country: 'CA',
      claim_method: 'EDI_837',
      website: 'https://sunlife.ca',
      plans: [{
        plan_name: 'Sun Life Group Benefits — Standard',
        plan_code: 'SUNLIFE-GRP-STD',
        preventive_coverage: 100, basic_coverage: 80, major_coverage: 50, ortho_coverage: 50,
        annual_max_amount: 1500, deductible_amount: 0,
        requires_preauth: true,
        coverage_rules: { currency: 'CAD', cdanet: true },
      }],
    },

    // ─── USA ───────────────────────────────────────────────────────────
    {
      short_code: 'DELTA_US',
      name: 'Delta Dental (USA)',
      type: 'PRIVATE_INSURANCE',
      country: 'US',
      claim_method: 'EDI_837',
      website: 'https://deltadental.com',
      notes: 'Largest dental insurer in the USA. PPO/Premier networks.',
      plans: [{
        plan_name: 'Delta PPO — Standard',
        plan_code: 'DELTA-PPO-STD',
        preventive_coverage: 100, basic_coverage: 80, major_coverage: 50, ortho_coverage: 50,
        annual_max_amount: 1500, deductible_amount: 50,
        requires_preauth: true,
        coverage_rules: { currency: 'USD', in_network_pct: 80, out_network_pct: 50 },
      }],
    },
    {
      short_code: 'METLIFE_US',
      name: 'MetLife Dental (USA)',
      type: 'PRIVATE_INSURANCE',
      country: 'US',
      claim_method: 'EDI_837',
      website: 'https://metlife.com/insurance/dental-insurance',
      plans: [{
        plan_name: 'MetLife PDP Plus — Standard',
        plan_code: 'METLIFE-PDP-STD',
        preventive_coverage: 100, basic_coverage: 80, major_coverage: 50,
        annual_max_amount: 1500, deductible_amount: 50,
        requires_preauth: true,
        coverage_rules: { currency: 'USD' },
      }],
    },
  ];

  let providersCreated = 0;
  let plansCreated = 0;
  for (const p of providers) {
    // Use the (clinic_id NULL, short_code) uniqueness to upsert global rows.
    // findFirst because Prisma's findUnique on composite-with-null isn't ideal here.
    const existing = await prismaClient.insuranceProvider.findFirst({
      where: { clinic_id: null, short_code: p.short_code },
    });

    const providerRow = existing
      ? await prismaClient.insuranceProvider.update({
          where: { id: existing.id },
          data: {
            name: p.name,
            type: p.type,
            country: p.country,
            claim_method: p.claim_method,
            tpa_name: p.tpa_name,
            website: p.website,
            notes: p.notes,
            is_active: true,
          },
        })
      : await (async () => {
          providersCreated++;
          return prismaClient.insuranceProvider.create({
            data: {
              clinic_id: null,
              short_code: p.short_code,
              name: p.name,
              type: p.type,
              country: p.country,
              claim_method: p.claim_method,
              tpa_name: p.tpa_name,
              website: p.website,
              notes: p.notes,
              is_active: true,
            },
          });
        })();

    for (const plan of p.plans) {
      const existingPlan = await prismaClient.insurancePlan.findFirst({
        where: { provider_id: providerRow.id, plan_name: plan.plan_name },
      });
      if (existingPlan) continue;
      plansCreated++;
      const currency = (plan.coverage_rules?.['currency'] as string | undefined) ??
        (p.country === 'US' ? 'USD' : p.country === 'CA' ? 'CAD' : 'INR');
      await prismaClient.insurancePlan.create({
        data: {
          provider_id: providerRow.id,
          plan_name: plan.plan_name,
          plan_code: plan.plan_code,
          coverage_rules: (plan.coverage_rules ?? {}) as never,
          preventive_coverage: plan.preventive_coverage ?? 100,
          basic_coverage: plan.basic_coverage ?? 80,
          major_coverage: plan.major_coverage ?? 50,
          ortho_coverage: plan.ortho_coverage ?? 0,
          annual_max_amount: plan.annual_max_amount === undefined ? null : (plan.annual_max_amount as never),
          deductible_amount: (plan.deductible_amount ?? 0) as never,
          currency,
          requires_preauth: plan.requires_preauth ?? false,
          requires_referral: plan.requires_referral ?? false,
        },
      });
    }
  }
  console.log(`Insurance providers: ${providersCreated} created (${providers.length - providersCreated} already existed); ${plansCreated} new plans seeded.`);
}

// ─── AP EHS dental rate card ───────────────────────────────────────────
// Official NTR Vaidya Seva Trust dental procedures + scheme prices.
// Source: drntrvaidyaseva.ap.gov.in/ehs · DENTAL SURGERY (S18) speciality.
// Prices are NON-NABH semi-private ward rates (INR). When private-ward
// differs, the higher value is noted in `notes`. Pre-auth evidence column
// stored in `notes` so clinics know what diagnostics to attach.
async function seedApEhsDentalRateCard(prismaClient: typeof prisma) {
  const provider = await prismaClient.insuranceProvider.findFirst({
    where: { clinic_id: null, short_code: 'AP_EHS' },
    include: { plans: true },
  });
  if (!provider) {
    console.log('AP_EHS provider not found — skipping rate card seed.');
    return;
  }
  const plan = provider.plans.find((p) => p.plan_code === 'APEHS-STD');
  if (!plan) {
    console.log('AP_EHS standard plan not found — skipping rate card seed.');
    return;
  }

  type Cat = 'preventive' | 'basic' | 'major' | 'ortho';
  const rows: Array<{
    code: string;
    description: string;
    category: Cat;
    max_fee: number;
    private_fee?: number; // when different from semi-private
    preauth?: string;
  }> = [
    // ── Preventive ──
    { code: '23.2.1',  description: 'Application Of Pit & Fissure Sealants (Pedo)', category: 'preventive', max_fee: 702,  preauth: 'RVG' },
    { code: '23.4.1',  description: 'Fluoride Gel Application (Pedo)',              category: 'preventive', max_fee: 1696, preauth: 'Clinical Photograph' },
    { code: '96.54.2', description: 'Oral Prophylaxis - Calculi (Upper/Lower)',     category: 'preventive', max_fee: 678,  preauth: 'BT/CT, CBP, RBS' },

    // ── Basic restorative + extraction + endo + minor surgery ──
    { code: '23.01',   description: 'Simple Extraction Of Tooth',                  category: 'basic', max_fee: 363,  preauth: 'BT/CT, CBP, IOPA/RVG, OPG' },
    { code: '23.2.2',  description: 'Amalgam Restoration Per Tooth',               category: 'basic', max_fee: 400,  preauth: 'IOPA' },
    { code: '23.2.4',  description: 'Tooth Coloured Restoration Per Tooth',        category: 'basic', max_fee: 545,  preauth: 'IOPA' },
    { code: '23.4.7',  description: 'Pulpotomy & Pulpectomy With SSC',             category: 'basic', max_fee: 1090, preauth: 'IOPA/RVG' },
    { code: '23.5',    description: 'Management Of Avulsed Tooth',                 category: 'basic', max_fee: 1126, preauth: 'IOPA, RVG' },
    { code: '23.6.2',  description: 'Treatment With Micro Implants (Each)',        category: 'basic', max_fee: 727,  preauth: 'BT/CT, CBP, IOPA, OPG' },
    { code: '23.7.2',  description: 'Root Canal Treatment',                        category: 'basic', max_fee: 2422, preauth: 'IOPA, OPG, RVG' },
    { code: '23.7.3',  description: 'Apicoectomy',                                 category: 'basic', max_fee: 2422, preauth: 'BT/CT, CBP, IOPA, RVG, RBS' },
    { code: '23.7.6',  description: 'Apicoectomy With Grafting',                   category: 'basic', max_fee: 2689, preauth: 'BT/CT, CBP, IOPA, RVG, RBS' },
    { code: '24.1',    description: 'Operculectomy',                               category: 'basic', max_fee: 533,  preauth: 'IOPA' },
    { code: '24.2.1',  description: 'Sub Gingival Curretage Per Quadrant',         category: 'basic', max_fee: 1005, preauth: 'OPG' },
    { code: '24.2.2',  description: 'Gingivectomy (Per Quadrant)',                 category: 'basic', max_fee: 1417, preauth: 'BT/CT, CBP, OPG, RBS' },
    { code: '25.92',   description: 'Frenectomy',                                  category: 'basic', max_fee: 799,  preauth: 'BT/CT, CBP, RBS' },
    { code: '27.3',    description: 'Incision & Drainage Of Facial Abscess Under L.A', category: 'basic', max_fee: 1817, preauth: 'BT/CT, CBP, OPG, RBS' },
    { code: '93.55.2', description: 'Splinting Of Teeth Under L.A',                category: 'basic', max_fee: 1151, preauth: 'BT/CT, CBP, IOPA, OPG, RBS' },
    { code: 'K13.5.C', description: 'Medical Management Of OSMF',                  category: 'basic', max_fee: 3633, preauth: 'Clinical evaluation' },
    { code: 'L43',     description: 'Medical Management Of Lichen Planus',         category: 'basic', max_fee: 1344, preauth: 'Clinical evaluation' },

    // ── Major (surgical, prosthetics, complex restorative) ──
    { code: '23.19.1', description: 'Extraction Of III Molar / Impacted Tooth Under L.A', category: 'major', max_fee: 2422,  preauth: 'BT/CT, CBP, IOPA, OPG, RVG' },
    { code: '23.19.2', description: 'Surgical Extraction Of Tooth',                       category: 'major', max_fee: 1211,  preauth: 'BT/CT, CBP, IOPA, OPG, RVG' },
    { code: '23.19.3', description: 'Extraction Of Deep Bony Impacted Tooth Under G.A.',  category: 'major', max_fee: 12111, preauth: 'BT/CT, CBP, OPG, PAC' },
    { code: '23.41.1', description: 'Preparation And Cementation Of Acrylic Crown',       category: 'major', max_fee: 254,   preauth: 'Lab — Model pouring, IOPA, OPG' },
    { code: '23.41.2', description: 'Fabrication & Cementation Of Metal Ceramic Crown (Per Unit)', category: 'major', max_fee: 1635, preauth: 'Lab — Model pouring, IOPA, OPG' },
    { code: '23.41.3', description: 'Preparation & Cementation Of Anterior All Ceramic Crown',     category: 'major', max_fee: 3694, preauth: 'Lab — Model pouring, IOPA, OPG' },
    { code: '23.41.5', description: 'Fibre Post & Core Restoration With Anterior All Ceramic Crown', category: 'major', max_fee: 4299, preauth: 'Lab — Model pouring, IOPA, OPG' },
    { code: '23.41.7', description: 'Metal Post & Core Restoration With Metal Ceramic Crown',        category: 'major', max_fee: 2422, preauth: 'Lab — Model pouring, IOPA, OPG' },
    { code: '23.43.4', description: 'Removable Partial Denture - Single Tooth',           category: 'major', max_fee: 666, preauth: 'Lab — Model pouring' },
    { code: '24.3.2',  description: 'Flap Surgery (Per Quadrant)',                        category: 'major', max_fee: 2083, preauth: 'BT/CT, CBP, OPG, RBS' },
    { code: '24.4.3',  description: 'Surgical Management Of Cyst (<2.5 cm) Under L.A.',   category: 'major', max_fee: 2071, preauth: 'BT/CT, CBP, OPG, RBS' },
    { code: '24.4.4',  description: 'Excision Of Growth Under L.A.',                      category: 'major', max_fee: 4021, preauth: 'BT/CT, CBP, OPG, RBS' },
    { code: '24.4.5',  description: 'Surgical Management Of Cyst (>2.5 cm) Under G.A.',   category: 'major', max_fee: 12922, preauth: 'BT/CT, CBP, IOPA, RBS' },
    { code: '24.5.1',  description: 'Alveoloplasty (Quadrant)',                           category: 'major', max_fee: 836,  preauth: 'BT/CT, CBP, OPG, PAC' },
    { code: '24.7.8',  description: 'Fabrication & Insertion Of Feeding Plate (Acrylic)', category: 'major', max_fee: 1114, preauth: 'Lab — Model pouring, OPG' },
    { code: '24.7.9',  description: 'Fabrication & Insertion Of Obturator - Acrylic',    category: 'major', max_fee: 1029, preauth: 'Lab — Model pouring' },
    { code: '76.74.2', description: 'Open Reduction & Internal Fixation Of Jaw Fractures Under G.A.', category: 'major', max_fee: 15249, private_fee: 15549, preauth: 'BT/CT, CBP, OPG, RBS' },
    { code: '76.75.2', description: 'Closed Reduction & Immobilisation Of Mandibular Fracture Under L.A.', category: 'major', max_fee: 2277, preauth: 'BT/CT, CBP, OPG, PAC' },
    { code: '81.2',    description: 'Surgical Management Of TMJ Ankylosis (G.A.)',       category: 'major', max_fee: 20436, private_fee: 21936, preauth: 'BT/CT, CBP, OPG, RBS' },
    { code: '93.55.1', description: 'Intermaxillary Fixation (IMF) For Alveolar Fractures Under L.A.', category: 'major', max_fee: 5050, preauth: 'BT/CT, CBP, IOPA, OPG, RBS' },
    { code: '99.97.2', description: 'Fabrication & Insertion Of Complete Denture (Upper/Lower)',      category: 'major', max_fee: 3851, preauth: 'OPG, Patient photo, Study Models' },
    { code: '99.97.6', description: 'Fabrication Of Over Dentures - Implant Supported (2 units)',    category: 'major', max_fee: 31925, preauth: 'BT/CT, CBP, Patient photo, RBS, OPG' },
    { code: '99.97.7', description: 'Fabrication Of Over Dentures With Attachments',                  category: 'major', max_fee: 13552, preauth: 'OPG, Patient photo, Study Models' },
    { code: 'K73.9.B', description: 'Chronic Hepatitis, Unspecified (medical management)',           category: 'major', max_fee: 16591, private_fee: 18691, preauth: 'ALT, AST, alpha anti-trypsin, alpha-fetoprotein' },

    // ── Orthodontics ──
    { code: '23.42.1', description: 'Placement Of Fixed Habit Breaking Appliances',       category: 'ortho', max_fee: 2483, preauth: 'Lab — Model pouring, IOPA, OPG' },
    { code: '23.42.2', description: 'Treatment With Expansion Plate',                     category: 'ortho', max_fee: 1986, preauth: 'Lab — Model pouring, IOPA, OPG' },
    { code: '23.43.1', description: 'Fabrication & Insertion Of Removable Habit Breaking Appliance', category: 'ortho', max_fee: 1841, preauth: 'Lab — Model pouring' },
    { code: '23.43.3', description: 'Fabrication & Insertion Of Removable Functional Appliance',    category: 'ortho', max_fee: 3452, preauth: 'Lab — Model pouring' },
    { code: '23.43.5', description: 'Fabrication & Insertion Of Removable Retainers - Each Arch',    category: 'ortho', max_fee: 824, preauth: 'Lab — Model pouring, OPG' },
    { code: '23.43.6', description: 'Fabrication & Insertion Of Fixed Space Maintainers / Space Retainer', category: 'ortho', max_fee: 1550, preauth: 'Lab — Model pouring, OPG' },
    { code: '23.43.8', description: 'Treatment With Inclined Plane',                       category: 'ortho', max_fee: 1078, preauth: 'Lab — Model pouring, OPG' },
    { code: '24.7.1',  description: 'Rapid Maxillary Expansion With Hyrax Screw / Palatal Expanders', category: 'ortho', max_fee: 4336, preauth: 'Lab — Model pouring, OPG' },
    { code: '24.7.3',  description: 'Treatment With Fixed Functional Appliances',         category: 'ortho', max_fee: 5716, preauth: 'Lab — Model pouring, Lateral Cephalogram, OPG' },
    { code: '24.7.5',  description: 'Fixed Orthodontics Treatment - Metal Braces',        category: 'ortho', max_fee: 12935, preauth: 'Lab — Model pouring, Lateral Cephalogram, OPG' },
    { code: '24.7.6',  description: 'Treatment With Fixed Retainers',                     category: 'ortho', max_fee: 1235, preauth: 'Lab — Model pouring, Lateral Cephalogram, OPG' },
    { code: '93.23.1', description: 'Chin Cup Therapy',                                   category: 'ortho', max_fee: 5280, preauth: 'Lab — Model pouring, Lateral Cephalogram, Case sheet, OPG' },
    { code: '93.23.2', description: 'Head Gear Therapy',                                  category: 'ortho', max_fee: 5026, preauth: 'Lab — Model pouring, Lateral Cephalogram, Case sheet, OPG' },
    { code: '93.23.3', description: 'Face Mask Therapy',                                  category: 'ortho', max_fee: 4178, preauth: 'Lab — Model pouring, Lateral Cephalogram, Case sheet, OPG' },
  ];

  let created = 0;
  let updated = 0;
  for (const r of rows) {
    const notesParts: string[] = [];
    if (r.preauth) notesParts.push(`Pre-auth evidence: ${r.preauth}`);
    if (r.private_fee && r.private_fee !== r.max_fee) {
      notesParts.push(`Private ward: ₹${r.private_fee}`);
    }
    const noteText = notesParts.length > 0 ? notesParts.join(' · ') : undefined;

    const existing = await prismaClient.insuranceProcedureCode.findUnique({
      where: { plan_id_code: { plan_id: plan.id, code: r.code } },
    });
    if (existing) {
      await prismaClient.insuranceProcedureCode.update({
        where: { id: existing.id },
        data: {
          description: r.description,
          category: r.category,
          max_fee: r.max_fee as never,
          notes: noteText,
        },
      });
      updated++;
    } else {
      await prismaClient.insuranceProcedureCode.create({
        data: {
          plan_id: plan.id,
          code: r.code,
          description: r.description,
          category: r.category,
          coverage_pct: 100, // AP EHS pays scheme rate in full (CGHS-style)
          max_fee: r.max_fee as never,
          notes: noteText,
        },
      });
      created++;
    }
  }
  console.log(`AP EHS rate card: ${created} procedure codes created, ${updated} updated (${rows.length} total).`);
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
