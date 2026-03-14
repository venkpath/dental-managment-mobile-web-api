import type { PrismaService } from '../../database/prisma.service.js';
import { Logger } from '@nestjs/common';

const logger = new Logger('TemplateSeed');

interface TemplateSeed {
  channel: string;
  category: string;
  template_name: string;
  subject?: string;
  body: string;
  variables: string[];
  language: string;
}

const DEFAULT_TEMPLATES: TemplateSeed[] = [
  // ─── Appointment Reminders ───
  {
    channel: 'all',
    category: 'reminder',
    template_name: 'Appointment Reminder - 24hr',
    subject: 'Reminder: Your appointment is tomorrow',
    body: 'Hi {{patient_name}}, this is a reminder that you have an appointment tomorrow ({{appointment_date}}) at {{appointment_time}} with {{dentist_name}} at {{clinic_name}}. Please arrive 10 minutes early. Call us at {{clinic_phone}} to reschedule.',
    variables: ['patient_name', 'appointment_date', 'appointment_time', 'dentist_name', 'clinic_name', 'clinic_phone'],
    language: 'en',
  },
  {
    channel: 'all',
    category: 'reminder',
    template_name: 'Appointment Reminder - 2hr',
    subject: 'Your appointment is in 2 hours',
    body: 'Hi {{patient_name}}, your appointment with {{dentist_name}} is in 2 hours at {{appointment_time}}. See you soon at {{clinic_name}}!',
    variables: ['patient_name', 'dentist_name', 'appointment_time', 'clinic_name'],
    language: 'en',
  },

  // ─── Payment Reminders ───
  {
    channel: 'all',
    category: 'reminder',
    template_name: 'Installment Due Reminder',
    subject: 'Payment reminder: Installment due on {{due_date}}',
    body: 'Hi {{patient_name}}, a friendly reminder that your installment of {{amount | currency:"INR"}} is due on {{due_date | format:"DD MMM YYYY"}}. Please visit {{clinic_name}} or contact us at {{clinic_phone}} for payment options.',
    variables: ['patient_name', 'amount', 'due_date', 'clinic_name', 'clinic_phone'],
    language: 'en',
  },
  {
    channel: 'all',
    category: 'reminder',
    template_name: 'Overdue Payment Notice',
    subject: 'Payment overdue — please contact us',
    body: 'Hi {{patient_name}}, your installment of {{amount | currency:"INR"}} was due on {{due_date | format:"DD MMM YYYY"}} and is now overdue. Please contact us at {{clinic_phone}} to arrange payment. We are happy to help with any questions.',
    variables: ['patient_name', 'amount', 'due_date', 'clinic_phone'],
    language: 'en',
  },
  {
    channel: 'all',
    category: 'transactional',
    template_name: 'Payment Confirmation',
    subject: 'Payment received — Thank you!',
    body: 'Hi {{patient_name}}, we have received your payment of {{amount | currency:"INR"}}. {{#if balance}}Your remaining balance is {{balance | currency:"INR"}}.{{/if}} Thank you for choosing {{clinic_name}}!',
    variables: ['patient_name', 'amount', 'balance', 'clinic_name'],
    language: 'en',
  },

  // ─── Birthday & Greeting ───
  {
    channel: 'all',
    category: 'greeting',
    template_name: 'Birthday Greeting',
    subject: 'Happy Birthday, {{patient_name}}! 🎂',
    body: 'Happy Birthday, {{patient_name}}! 🎂 Wishing you a wonderful day filled with smiles. As a birthday gift, enjoy a special offer on your next visit to {{clinic_name}}! Call us at {{clinic_phone}} to book.',
    variables: ['patient_name', 'clinic_name', 'clinic_phone'],
    language: 'en',
  },
  {
    channel: 'all',
    category: 'greeting',
    template_name: 'Festival Greeting',
    subject: 'Happy {{festival_name}} from {{clinic_name}}!',
    body: 'Dear {{patient_name}}, wishing you and your family a very Happy {{festival_name}}! May this occasion bring joy and good health. {{#if offer_details}}Special offer: {{offer_details}}{{/if}} — Team {{clinic_name}}',
    variables: ['patient_name', 'festival_name', 'clinic_name', 'offer_details'],
    language: 'en',
  },
  {
    channel: 'all',
    category: 'greeting',
    template_name: 'Patient Anniversary',
    subject: 'Happy Anniversary with {{clinic_name}}!',
    body: 'Hi {{patient_name}}, it has been {{years}} year(s) since you joined {{clinic_name}}! Thank you for trusting us with your dental care. We look forward to keeping your smile healthy for many more years.',
    variables: ['patient_name', 'years', 'clinic_name'],
    language: 'en',
  },

  // ─── Post-Treatment Care ───
  {
    channel: 'all',
    category: 'follow_up',
    template_name: 'Post-Treatment Care - Extraction',
    subject: 'Care instructions after your tooth extraction',
    body: 'Hi {{patient_name}}, here are your post-extraction care instructions:\n\n• Bite on gauze for 30 minutes\n• Do not spit, rinse, or use a straw for 24 hours\n• Avoid hot food and beverages today\n• Take prescribed medications as directed\n• Apply ice pack externally for 15 min on/off\n• Eat soft foods for 2-3 days\n\nContact {{clinic_name}} at {{clinic_phone}} if you experience excessive bleeding or pain.',
    variables: ['patient_name', 'clinic_name', 'clinic_phone'],
    language: 'en',
  },
  {
    channel: 'all',
    category: 'follow_up',
    template_name: 'Post-Treatment Care - RCT',
    subject: 'Care instructions after your root canal treatment',
    body: 'Hi {{patient_name}}, here are your post-RCT care instructions:\n\n• Avoid chewing on the treated side for 48 hours\n• Take prescribed pain medications as directed\n• Some mild discomfort is normal for a few days\n• Avoid hard or sticky foods\n• Get a dental crown placed within 2-4 weeks\n\nContact {{clinic_name}} at {{clinic_phone}} if pain increases or swelling occurs.',
    variables: ['patient_name', 'clinic_name', 'clinic_phone'],
    language: 'en',
  },
  {
    channel: 'all',
    category: 'follow_up',
    template_name: 'Post-Treatment Care - Filling',
    subject: 'Care instructions after your dental filling',
    body: 'Hi {{patient_name}}, your filling care instructions:\n\n• Avoid eating for 2 hours (if amalgam filling)\n• Composite fillings — you can eat immediately\n• Sensitivity to hot/cold is normal for a few days\n• Avoid very hard foods on the treated tooth for 24 hours\n\nContact {{clinic_name}} at {{clinic_phone}} if you experience persistent pain or if the filling feels high when biting.',
    variables: ['patient_name', 'clinic_name', 'clinic_phone'],
    language: 'en',
  },
  {
    channel: 'all',
    category: 'follow_up',
    template_name: 'Post-Treatment Care - Scaling',
    subject: 'Care instructions after your teeth cleaning',
    body: 'Hi {{patient_name}}, post-scaling care tips:\n\n• Use a soft-bristled toothbrush for 3 days\n• Mild sensitivity is normal and will subside\n• Avoid very hot or cold foods for 24 hours\n• Continue regular brushing and flossing\n• Schedule your next cleaning in 6 months\n\nKeep smiling! — {{clinic_name}}',
    variables: ['patient_name', 'clinic_name'],
    language: 'en',
  },

  // ─── Follow-Up ───
  {
    channel: 'all',
    category: 'follow_up',
    template_name: 'Post-Visit Feedback Request',
    subject: 'How was your visit to {{clinic_name}}?',
    body: 'Hi {{patient_name}}, thank you for visiting {{clinic_name}} today! We would love to hear about your experience. Please rate us on a scale of 1-5 stars. Your feedback helps us serve you better!',
    variables: ['patient_name', 'clinic_name'],
    language: 'en',
  },
  {
    channel: 'all',
    category: 'follow_up',
    template_name: 'Google Review Request',
    subject: 'Would you leave us a review?',
    body: 'Hi {{patient_name}}, thank you for the wonderful feedback! Would you mind sharing your experience on Google? It helps other patients find quality dental care. {{google_review_url}} — Thank you, {{clinic_name}}',
    variables: ['patient_name', 'clinic_name', 'google_review_url'],
    language: 'en',
  },
  {
    channel: 'all',
    category: 'follow_up',
    template_name: 'No-Show Follow-Up',
    subject: 'We missed you today!',
    body: 'Hi {{patient_name}}, we noticed you missed your appointment today at {{appointment_time}}. We hope everything is okay! Would you like to reschedule? Call us at {{clinic_phone}} or reply to book a new appointment. — {{clinic_name}}',
    variables: ['patient_name', 'appointment_time', 'clinic_phone', 'clinic_name'],
    language: 'en',
  },
  {
    channel: 'all',
    category: 'follow_up',
    template_name: 'Treatment Plan Reminder',
    subject: 'Your treatment plan needs attention',
    body: 'Hi {{patient_name}}, you have an incomplete treatment ({{procedure}} on tooth {{tooth_number}}) that needs a follow-up visit. Please book your next appointment at {{clinic_name}} — call {{clinic_phone}}. Regular treatment completion is important for your dental health.',
    variables: ['patient_name', 'procedure', 'tooth_number', 'clinic_name', 'clinic_phone'],
    language: 'en',
  },
  {
    channel: 'all',
    category: 'follow_up',
    template_name: 'Prescription Refill Reminder',
    subject: 'Your medication is about to finish',
    body: 'Hi {{patient_name}}, the medication prescribed on {{prescription_date | format:"DD MMM YYYY"}} ({{medicine_name}}) is about to finish. If symptoms persist, please visit {{clinic_name}} for a follow-up. Call us at {{clinic_phone}}.',
    variables: ['patient_name', 'prescription_date', 'medicine_name', 'clinic_name', 'clinic_phone'],
    language: 'en',
  },

  // ─── Reactivation ───
  {
    channel: 'all',
    category: 'campaign',
    template_name: 'Reactivation - Gentle Reminder',
    subject: 'We miss you at {{clinic_name}}!',
    body: 'Hi {{patient_name}}, it has been a while since your last visit to {{clinic_name}}. Regular dental check-ups help catch problems early. Book your next visit today — call {{clinic_phone}}. We look forward to seeing you!',
    variables: ['patient_name', 'clinic_name', 'clinic_phone'],
    language: 'en',
  },
  {
    channel: 'all',
    category: 'campaign',
    template_name: 'Reactivation - With Offer',
    subject: 'Special offer for you at {{clinic_name}}',
    body: 'Hi {{patient_name}}, we would love to see you back at {{clinic_name}}! As a special offer, enjoy {{offer_percentage}}% off on {{offer_treatment}}. Valid until {{offer_valid_until | format:"DD MMM YYYY"}}. Call {{clinic_phone}} to book!',
    variables: ['patient_name', 'clinic_name', 'clinic_phone', 'offer_percentage', 'offer_treatment', 'offer_valid_until'],
    language: 'en',
  },

  // ─── Campaign ───
  {
    channel: 'all',
    category: 'campaign',
    template_name: 'General Campaign',
    subject: '{{campaign_subject}}',
    body: 'Dear {{patient_name}}, {{campaign_body}} — {{clinic_name}}',
    variables: ['patient_name', 'campaign_subject', 'campaign_body', 'clinic_name'],
    language: 'en',
  },

  // ─── Referral ───
  {
    channel: 'all',
    category: 'referral',
    template_name: 'Referral Invitation',
    subject: 'Share the smile — Refer a friend!',
    body: 'Hi {{patient_name}}, loved your visit to {{clinic_name}}? Refer a friend and both of you get {{reward}}! Share your referral code: {{referral_code}}. Just ask them to mention this code when they visit. Thank you!',
    variables: ['patient_name', 'clinic_name', 'reward', 'referral_code'],
    language: 'en',
  },
  {
    channel: 'all',
    category: 'referral',
    template_name: 'Referral Reward Notification',
    subject: 'Your referral reward is ready!',
    body: 'Hi {{patient_name}}, great news! Your referral {{referred_name}} visited {{clinic_name}}. Your reward of {{reward}} has been credited to your account. Thank you for spreading the word!',
    variables: ['patient_name', 'referred_name', 'clinic_name', 'reward'],
    language: 'en',
  },

  // ─── Authentication ───
  {
    channel: 'email',
    category: 'transactional',
    template_name: 'Email Verification',
    subject: 'Verify your email — {{clinic_name}}',
    body: 'Hi {{user_name}}, please verify your email address by clicking the link below:\n\n{{verification_link}}\n\nThis link expires in 24 hours. If you did not create an account, please ignore this email.',
    variables: ['user_name', 'verification_link', 'clinic_name'],
    language: 'en',
  },
  {
    channel: 'email',
    category: 'transactional',
    template_name: 'Password Reset',
    subject: 'Reset your password — {{clinic_name}}',
    body: 'Hi {{user_name}}, we received a request to reset your password. Click the link below:\n\n{{reset_link}}\n\nThis link expires in 1 hour. If you did not request this, your account is safe — no action needed.',
    variables: ['user_name', 'reset_link', 'clinic_name'],
    language: 'en',
  },
  {
    channel: 'all',
    category: 'transactional',
    template_name: 'OTP Verification',
    subject: 'Your OTP code',
    body: 'Your verification code is: {{otp_code}}. This code expires in 10 minutes. Do not share this code with anyone.',
    variables: ['otp_code'],
    language: 'en',
  },
];

export async function seedDefaultTemplates(prisma: PrismaService): Promise<void> {
  logger.log('Seeding default message templates...');

  let created = 0;
  for (const template of DEFAULT_TEMPLATES) {
    const existing = await prisma.messageTemplate.findFirst({
      where: {
        clinic_id: null, // system template
        template_name: template.template_name,
        language: template.language,
      },
    });

    if (!existing) {
      await prisma.messageTemplate.create({
        data: {
          clinic_id: null,
          channel: template.channel,
          category: template.category,
          template_name: template.template_name,
          subject: template.subject,
          body: template.body,
          variables: template.variables,
          language: template.language,
          is_active: true,
        },
      });
      created++;
    }
  }

  logger.log(`Seeded ${created} new templates (${DEFAULT_TEMPLATES.length - created} already existed)`);
}
