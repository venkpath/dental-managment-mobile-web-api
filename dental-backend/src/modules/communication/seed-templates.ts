import type { PrismaService } from '../../database/prisma.service.js';
import { Logger } from '@nestjs/common';

const logger = new Logger('TemplateSeed');

interface WhatsAppButtonSeed {
  type: 'url' | 'quick_reply';
  index: number;
}

interface TemplateSeed {
  channel: string;
  category: string;
  template_name: string;
  subject?: string;
  footer?: string;
  body: string;
  variables: string[] | { body: string[]; buttons: WhatsAppButtonSeed[] };
  language: string;
  /** Default sample values for Meta approval — keyed by variable name */
  sampleValues?: Record<string, string>;
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

  // ─── Appointment Lifecycle (Email) ───
  {
    channel: 'email',
    category: 'transactional',
    template_name: 'Appointment Confirmation',
    subject: 'Appointment confirmed at {{clinic_name}}',
    body: 'Hi {{patient_name}}, your appointment is confirmed with {{doctor_name}} on {{date}} at {{time}}. If you need to make changes, call us at {{phone}}. — {{clinic_name}}',
    variables: ['patient_name', 'doctor_name', 'date', 'time', 'clinic_name', 'phone'],
    language: 'en',
  },
  {
    channel: 'email',
    category: 'transactional',
    template_name: 'Appointment Cancelled',
    subject: 'Your appointment has been cancelled',
    body: 'Hi {{patient_name}}, your appointment at {{clinic_name}} scheduled for {{date}} at {{time}} has been cancelled. Please call {{phone}} if you would like to reschedule.',
    variables: ['patient_name', 'clinic_name', 'date', 'time', 'phone'],
    language: 'en',
  },
  {
    channel: 'email',
    category: 'transactional',
    template_name: 'Appointment Rescheduled',
    subject: 'Your appointment has been rescheduled',
    body: 'Hi {{patient_name}}, your appointment at {{clinic_name}} has been rescheduled from {{previous_time}} to {{new_time}}. For questions, call us at {{phone}}.',
    variables: ['patient_name', 'previous_time', 'new_time', 'clinic_name', 'phone'],
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

  // ═══════════════════════════════════════════════════════════════
  // ─── Hindi (hi) Templates ───
  // ═══════════════════════════════════════════════════════════════

  // ─── Appointment Reminders (Hindi) ───
  {
    channel: 'all',
    category: 'reminder',
    template_name: 'Appointment Reminder - 24hr',
    subject: 'रिमाइंडर: आपकी अपॉइंटमेंट कल है',
    body: 'नमस्ते {{patient_name}}, आपकी अपॉइंटमेंट कल ({{appointment_date}}) {{appointment_time}} बजे {{dentist_name}} के साथ {{clinic_name}} में है। कृपया 10 मिनट पहले पहुँचें। रिशेड्यूल करने के लिए {{clinic_phone}} पर कॉल करें।',
    variables: ['patient_name', 'appointment_date', 'appointment_time', 'dentist_name', 'clinic_name', 'clinic_phone'],
    language: 'hi',
  },
  {
    channel: 'all',
    category: 'reminder',
    template_name: 'Appointment Reminder - 2hr',
    subject: 'आपकी अपॉइंटमेंट 2 घंटे में है',
    body: 'नमस्ते {{patient_name}}, {{dentist_name}} के साथ आपकी अपॉइंटमेंट {{appointment_time}} बजे, यानी 2 घंटे में है। {{clinic_name}} में आपका स्वागत है!',
    variables: ['patient_name', 'dentist_name', 'appointment_time', 'clinic_name'],
    language: 'hi',
  },

  // ─── Payment Reminders (Hindi) ───
  {
    channel: 'all',
    category: 'reminder',
    template_name: 'Installment Due Reminder',
    subject: 'भुगतान रिमाइंडर: किस्त {{due_date}} को देय है',
    body: 'नमस्ते {{patient_name}}, यह याद दिलाने के लिए कि आपकी {{amount}} की किस्त {{due_date}} को देय है। भुगतान के लिए {{clinic_name}} पर आएं या {{clinic_phone}} पर संपर्क करें।',
    variables: ['patient_name', 'amount', 'due_date', 'clinic_name', 'clinic_phone'],
    language: 'hi',
  },
  {
    channel: 'all',
    category: 'reminder',
    template_name: 'Overdue Payment Notice',
    subject: 'भुगतान बकाया — कृपया संपर्क करें',
    body: 'नमस्ते {{patient_name}}, आपकी {{amount}} की किस्त {{due_date}} को देय थी और अब बकाया है। कृपया भुगतान की व्यवस्था के लिए {{clinic_phone}} पर संपर्क करें।',
    variables: ['patient_name', 'amount', 'due_date', 'clinic_phone'],
    language: 'hi',
  },
  {
    channel: 'all',
    category: 'transactional',
    template_name: 'Payment Confirmation',
    subject: 'भुगतान प्राप्त — धन्यवाद!',
    body: 'नमस्ते {{patient_name}}, हमें आपका {{amount}} का भुगतान प्राप्त हो गया है। {{#if balance}}आपकी शेष राशि {{balance}} है।{{/if}} {{clinic_name}} को चुनने के लिए धन्यवाद!',
    variables: ['patient_name', 'amount', 'balance', 'clinic_name'],
    language: 'hi',
  },

  // ─── Birthday & Greeting (Hindi) ───
  {
    channel: 'all',
    category: 'greeting',
    template_name: 'Birthday Greeting',
    subject: 'जन्मदिन मुबारक, {{patient_name}}! 🎂',
    body: 'जन्मदिन मुबारक, {{patient_name}}! 🎂 आपका दिन खुशियों से भरा हो। जन्मदिन के उपहार के रूप में, {{clinic_name}} में अपनी अगली विज़िट पर विशेष छूट पाएं! बुक करने के लिए {{clinic_phone}} पर कॉल करें।',
    variables: ['patient_name', 'clinic_name', 'clinic_phone'],
    language: 'hi',
  },
  {
    channel: 'all',
    category: 'greeting',
    template_name: 'Festival Greeting',
    subject: '{{clinic_name}} की ओर से {{festival_name}} की शुभकामनाएं!',
    body: 'प्रिय {{patient_name}}, आपको और आपके परिवार को {{festival_name}} की हार्दिक शुभकामनाएं! यह अवसर आपके लिए खुशियां और अच्छा स्वास्थ्य लाए। {{#if offer_details}}विशेष ऑफर: {{offer_details}}{{/if}} — टीम {{clinic_name}}',
    variables: ['patient_name', 'festival_name', 'clinic_name', 'offer_details'],
    language: 'hi',
  },
  {
    channel: 'all',
    category: 'greeting',
    template_name: 'Patient Anniversary',
    subject: '{{clinic_name}} के साथ वर्षगांठ मुबारक!',
    body: 'नमस्ते {{patient_name}}, {{clinic_name}} के साथ आपको {{years}} साल हो गए! अपनी दंत चिकित्सा के लिए हम पर भरोसा करने के लिए धन्यवाद। हम आने वाले कई और सालों तक आपकी मुस्कान को स्वस्थ रखना चाहते हैं।',
    variables: ['patient_name', 'years', 'clinic_name'],
    language: 'hi',
  },

  // ─── Post-Treatment Care (Hindi) ───
  {
    channel: 'all',
    category: 'follow_up',
    template_name: 'Post-Treatment Care - Extraction',
    subject: 'दांत निकालने के बाद देखभाल के निर्देश',
    body: 'नमस्ते {{patient_name}}, दांत निकालने के बाद की देखभाल:\n\n• 30 मिनट तक रुई पर दबाव बनाए रखें\n• 24 घंटे तक थूकें नहीं, कुल्ला न करें, स्ट्रॉ का उपयोग न करें\n• आज गर्म खाना और पेय से बचें\n• दवाइयां समय पर लें\n• बाहर से बर्फ 15 मिनट लगाएं\n• 2-3 दिन नरम खाना खाएं\n\nअधिक रक्तस्राव या दर्द होने पर {{clinic_name}} से {{clinic_phone}} पर संपर्क करें।',
    variables: ['patient_name', 'clinic_name', 'clinic_phone'],
    language: 'hi',
  },
  {
    channel: 'all',
    category: 'follow_up',
    template_name: 'Post-Treatment Care - RCT',
    subject: 'रूट कैनाल के बाद देखभाल के निर्देश',
    body: 'नमस्ते {{patient_name}}, रूट कैनाल के बाद की देखभाल:\n\n• 48 घंटे तक इलाज वाली तरफ से न चबाएं\n• दर्द की दवा समय पर लें\n• कुछ दिनों तक हल्का दर्द सामान्य है\n• सख्त या चिपचिपा खाना न खाएं\n• 2-4 सप्ताह में कैप लगवाएं\n\nदर्द बढ़ने या सूजन होने पर {{clinic_name}} से {{clinic_phone}} पर संपर्क करें।',
    variables: ['patient_name', 'clinic_name', 'clinic_phone'],
    language: 'hi',
  },

  // ─── Follow-Up (Hindi) ───
  {
    channel: 'all',
    category: 'follow_up',
    template_name: 'Post-Visit Feedback Request',
    subject: '{{clinic_name}} में आपका अनुभव कैसा रहा?',
    body: 'नमस्ते {{patient_name}}, {{clinic_name}} में आने के लिए धन्यवाद! कृपया 1-5 स्टार में अपना अनुभव बताएं। आपकी प्रतिक्रिया हमें बेहतर सेवा देने में मदद करती है!',
    variables: ['patient_name', 'clinic_name'],
    language: 'hi',
  },
  {
    channel: 'all',
    category: 'follow_up',
    template_name: 'No-Show Follow-Up',
    subject: 'आज हम आपकी प्रतीक्षा कर रहे थे!',
    body: 'नमस्ते {{patient_name}}, आज {{appointment_time}} बजे आपकी अपॉइंटमेंट थी लेकिन आप नहीं आ सके। हम आशा करते हैं सब ठीक है! क्या आप रिशेड्यूल करना चाहेंगे? {{clinic_phone}} पर कॉल करें — {{clinic_name}}',
    variables: ['patient_name', 'appointment_time', 'clinic_phone', 'clinic_name'],
    language: 'hi',
  },
  {
    channel: 'all',
    category: 'follow_up',
    template_name: 'Treatment Plan Reminder',
    subject: 'आपके इलाज में ध्यान देने की ज़रूरत है',
    body: 'नमस्ते {{patient_name}}, आपका अधूरा इलाज ({{procedure}}, दांत {{tooth_number}}) के लिए फॉलो-अप विज़िट ज़रूरी है। {{clinic_name}} में अपॉइंटमेंट बुक करें — {{clinic_phone}} पर कॉल करें।',
    variables: ['patient_name', 'procedure', 'tooth_number', 'clinic_name', 'clinic_phone'],
    language: 'hi',
  },
  {
    channel: 'all',
    category: 'follow_up',
    template_name: 'Prescription Refill Reminder',
    subject: 'आपकी दवाई खत्म होने वाली है',
    body: 'नमस्ते {{patient_name}}, {{prescription_date}} को दी गई दवाई ({{medicine_name}}) खत्म होने वाली है। अगर लक्षण बने हुए हैं तो {{clinic_name}} में फॉलो-अप के लिए आएं। {{clinic_phone}} पर कॉल करें।',
    variables: ['patient_name', 'prescription_date', 'medicine_name', 'clinic_name', 'clinic_phone'],
    language: 'hi',
  },

  // ─── Reactivation (Hindi) ───
  {
    channel: 'all',
    category: 'campaign',
    template_name: 'Reactivation - Gentle Reminder',
    subject: '{{clinic_name}} में आपकी कमी है!',
    body: 'नमस्ते {{patient_name}}, {{clinic_name}} में आपकी आखिरी विज़िट को काफी समय हो गया है। नियमित डेंटल चेकअप से समस्याओं का जल्दी पता चलता है। आज ही अपॉइंटमेंट बुक करें — {{clinic_phone}} पर कॉल करें!',
    variables: ['patient_name', 'clinic_name', 'clinic_phone'],
    language: 'hi',
  },
  {
    channel: 'all',
    category: 'campaign',
    template_name: 'Reactivation - With Offer',
    subject: '{{clinic_name}} में आपके लिए विशेष ऑफर',
    body: 'नमस्ते {{patient_name}}, {{clinic_name}} में आपका फिर से स्वागत है! विशेष ऑफर: {{offer_treatment}} पर {{offer_percentage}}% छूट। {{offer_valid_until}} तक वैध। बुक करने के लिए {{clinic_phone}} पर कॉल करें!',
    variables: ['patient_name', 'clinic_name', 'clinic_phone', 'offer_percentage', 'offer_treatment', 'offer_valid_until'],
    language: 'hi',
  },

  // ─── Referral (Hindi) ───
  {
    channel: 'all',
    category: 'referral',
    template_name: 'Referral Invitation',
    subject: 'अपनी मुस्कान बांटें — दोस्त को रेफर करें!',
    body: 'नमस्ते {{patient_name}}, {{clinic_name}} का अनुभव पसंद आया? एक दोस्त को रेफर करें और दोनों को {{reward}} मिलेगा! आपका रेफरल कोड: {{referral_code}}।',
    variables: ['patient_name', 'clinic_name', 'reward', 'referral_code'],
    language: 'hi',
  },

  // ─── Authentication (Hindi) ───
  {
    channel: 'all',
    category: 'transactional',
    template_name: 'OTP Verification',
    subject: 'आपका OTP कोड',
    body: 'आपका सत्यापन कोड है: {{otp_code}}। यह कोड 10 मिनट में समाप्त हो जाएगा। इस कोड को किसी के साथ साझा न करें।',
    variables: ['otp_code'],
    language: 'hi',
  },

  // ═══════════════════════════════════════════════════════════════
  // ─── WhatsApp Meta Templates (channel: whatsapp) ───
  // These match approved Meta template names exactly.
  // variables.body = ordered body params ({{1}}, {{2}}, ...)
  // variables.buttons = URL buttons that need a dynamic parameter
  // sampleValues = default sample values for Meta approval
  // ═══════════════════════════════════════════════════════════════

  // ── 1. Appointment Confirmation ──
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'dental_appointment_confirmation',
    body: 'Hi {{patient_name}}, your appointment is confirmed.\nDoctor: {{doctor_name}}\nDate: {{date}}\nTime: {{time}}\nClinic: {{clinic_name}}\nCall us at {{phone}} for any queries.',
    variables: { body: ['patient_name', 'doctor_name', 'date', 'time', 'clinic_name', 'phone'], buttons: [] },
    language: 'en',
    sampleValues: { patient_name: 'Priya Sharma', doctor_name: 'Dr. Anil Mehta', date: '15 Jan 2026', time: '10:30 AM', clinic_name: 'Smile Dental Clinic', phone: '9876543210' },
  },

  // ── 2. Appointment Reminder ──
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'dental_appointment_reminder',
    body: 'Hi {{patient_name}}, this is a reminder for your appointment tomorrow.\nDate: {{date}}\nTime: {{time}}\nClinic: {{clinic_name}}\nDoctor: {{doctor_name}}\nPlease arrive 5 minutes early. Call us at {{phone}} for any queries.',
    variables: { body: ['patient_name', 'date', 'time', 'clinic_name', 'doctor_name', 'phone'], buttons: [] },
    language: 'en',
    sampleValues: { patient_name: 'Priya Sharma', date: '16 Jan 2026', time: '10:30 AM', clinic_name: 'Smile Dental Clinic', doctor_name: 'Dr. Anil Mehta', phone: '9876543210' },
  },

  // ── 3. Appointment Cancelled ──
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'dental_appointment_cancel',
    body: 'Hi {{patient_name}}, your appointment at {{clinic_name}} scheduled for {{date}} at {{time}} has been cancelled.\nPlease call us at {{phone}} to reschedule at your convenience.',
    variables: { body: ['patient_name', 'clinic_name', 'date', 'time', 'phone'], buttons: [] },
    language: 'en',
    sampleValues: { patient_name: 'Priya Sharma', clinic_name: 'Smile Dental Clinic', date: '15 Jan 2026', time: '10:30 AM', phone: '9876543210' },
  },

  // ── 4. Appointment Rescheduled ──
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'dental_appointment_rescheduled',
    body: 'Hi {{patient_name}}, your appointment has been rescheduled.\nPrevious Time: {{previous_time}}\nNew Time: {{new_time}}\nClinic: {{clinic_name}}\nPlease call us at {{phone}} for any queries.',
    variables: { body: ['patient_name', 'previous_time', 'new_time', 'clinic_name', 'phone'], buttons: [] },
    language: 'en',
    sampleValues: { patient_name: 'Priya Sharma', previous_time: '15 Jan 10:30 AM', new_time: '16 Jan 11:00 AM', clinic_name: 'Smile Dental Clinic', phone: '9876543210' },
  },

  // ── 4b. Appointment Confirmation — Dentist (sent to the consultant) ──
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'dental_appointment_confirmation_dentist',
    body: 'Hello Dr. {{doctor_name}}, A new appointment has been scheduled. Patient: {{patient_name}} Date: {{date}} Time: {{time}} Treatment: {{treatment}} Please be available accordingly.',
    variables: { body: ['doctor_name', 'patient_name', 'date', 'time', 'treatment'], buttons: [] },
    language: 'en',
    sampleValues: { doctor_name: 'Anil Mehta', patient_name: 'Priya Sharma', date: '15 Jan 2026', time: '10:30 AM', treatment: 'Root Canal' },
  },

  // ── 4c. Appointment Reminder — Dentist (sent to the consultant) ──
  // Only ONE reminder is fired (the closer one), and the {{time}} slot
  // includes a bracketed countdown like "10:30 AM (in 30 min)" so the
  // dentist gets the urgency at a glance.
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'dental_appointment_reminder_dentist',
    body: 'Hello Dr. {{doctor_name}}, Reminder for your upcoming appointment: Patient: {{patient_name}} Time: {{time}} Treatment: {{treatment}} Please ensure timely availability.',
    variables: { body: ['doctor_name', 'patient_name', 'time', 'treatment'], buttons: [] },
    language: 'en',
    sampleValues: { doctor_name: 'Anil Mehta', patient_name: 'Priya Sharma', time: '10:30 AM (in 30 min)', treatment: 'Root Canal' },
  },

  // ── 5. Post-Treatment Care ──
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'dental_post_treatment_care',
    body: 'Hi {{patient_name}}, here are your care instructions after your {{procedure}} at {{clinic_name}}.\nFollow your doctor {{doctor_name}}\'s advice carefully.\nCall us at {{phone}} if you experience any discomfort.',
    variables: { body: ['patient_name', 'procedure', 'clinic_name', 'doctor_name', 'phone'], buttons: [] },
    language: 'en',
    sampleValues: { patient_name: 'Priya Sharma', procedure: 'Root Canal', clinic_name: 'Smile Dental Clinic', doctor_name: 'Dr. Anil Mehta', phone: '9876543210' },
  },

  // ── 6. No-Show Follow-Up ──
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'dental_noshow_followup',
    body: 'Hi {{patient_name}}, we noticed you missed your appointment at {{clinic_name}} today.\nWe understand things come up. Please call us at {{phone}} to reschedule at your convenience.\nWe are here to help!',
    variables: { body: ['patient_name', 'clinic_name', 'phone'], buttons: [] },
    language: 'en',
    sampleValues: { patient_name: 'Priya Sharma', clinic_name: 'Smile Dental Clinic', phone: '9876543210' },
  },

  // ── 7. Treatment Reminder ──
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'dental_treatment_reminder',
    body: 'Hi {{patient_name}}, this is a gentle reminder that you have pending steps in your treatment plan at {{clinic_name}}.\nCompleting your treatment on time ensures the best results. Please call us to schedule your next visit.',
    variables: { body: ['patient_name', 'clinic_name'], buttons: [] },
    language: 'en',
    sampleValues: { patient_name: 'Priya Sharma', clinic_name: 'Smile Dental Clinic' },
  },

  // ── 8. Payment Received ──
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'dental_payment_received',
    body: 'Hi {{patient_name}},\n\nWe have received your payment of {{amount}} for invoice {{invoice_no}} at {{clinic_name}}.\n\nYour receipt is ready. View & download:\n{{receipt_link}}\n\nPlease call us at {{phone}} for any queries.',
    variables: { body: ['patient_name', 'amount', 'invoice_no', 'clinic_name', 'receipt_link', 'phone'], buttons: [] },
    language: 'en',
    sampleValues: { patient_name: 'Priya Sharma', amount: 'Rs.5000', invoice_no: 'INV-2026-001', clinic_name: 'Smile Dental Clinic', receipt_link: 'https://example.com/receipt', phone: '9876543210' },
  },

  // ── 9. Invoice Ready ──
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'dental_invoice_ready',
    body: 'Hello {{patient_name}}, your invoice has been generated at {{clinic_name}}.\nInvoice No: {{invoice_no}}, Amount: {{amount}}.\nView & Download: {{invoice_link}}.\nFor queries reach us at {{phone}}.',
    variables: { body: ['patient_name', 'clinic_name', 'invoice_no', 'amount', 'invoice_link', 'phone'], buttons: [] },
    language: 'en',
    sampleValues: { patient_name: 'Priya Sharma', clinic_name: 'Smile Dental Clinic', invoice_no: 'INV-2026-001', amount: 'Rs.5000', invoice_link: 'https://example.com/invoice', phone: '9876543210' },
  },

  // ── 10. Installment Due ──
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'dental_installment_due',
    body: 'Hi {{patient_name}}, your installment of {{amount}} is due on {{due_date}} at {{clinic_name}}.\nPlease make the payment on time. Contact us at {{phone}} for any queries.',
    variables: { body: ['patient_name', 'amount', 'due_date', 'clinic_name', 'phone'], buttons: [] },
    language: 'en',
    sampleValues: { patient_name: 'Priya Sharma', amount: 'Rs.2000', due_date: '20 Jan 2026', clinic_name: 'Smile Dental Clinic', phone: '9876543210' },
  },

  // ── 11. Payment Overdue ──
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'dental_payment_overdue',
    body: 'Hi {{patient_name}}, your installment of {{amount}} due on {{due_date}} is overdue.\nPlease contact {{clinic_name}} at {{phone}} to make the payment at your earliest convenience.',
    variables: { body: ['patient_name', 'amount', 'due_date', 'clinic_name', 'phone'], buttons: [] },
    language: 'en',
    sampleValues: { patient_name: 'Priya Sharma', amount: 'Rs.2000', due_date: '10 Jan 2026', clinic_name: 'Smile Dental Clinic', phone: '9876543210' },
  },

  // ── 12. Reactivation (MARKETING) ──
  {
    channel: 'whatsapp',
    category: 'campaign',
    template_name: 'dental_reactivation',
    body: 'Hi {{patient_name}}, it has been a while since your last visit to {{clinic_name}}.\nRegular dental checkups are important for your oral health.\nBook your appointment today and get back on track with your dental care!\nCall us at {{phone}}.',
    variables: { body: ['patient_name', 'clinic_name', 'phone'], buttons: [] },
    language: 'en',
    sampleValues: { patient_name: 'Priya Sharma', clinic_name: 'Smile Dental Clinic', phone: '9876543210' },
  },

  // ── 13. Feedback Request ──
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'dental_feedback_request',
    body: 'Hi {{patient_name}}, thank you for visiting {{clinic_name}}.\nWe hope your experience was wonderful! We would love to hear your feedback\nto help us serve you better. Your opinion truly matters to us.',
    variables: { body: ['patient_name', 'clinic_name'], buttons: [] },
    language: 'en',
    sampleValues: { patient_name: 'Priya Sharma', clinic_name: 'Smile Dental Clinic' },
  },

  // ── 14. Birthday Greeting (MARKETING) ──
  {
    channel: 'whatsapp',
    category: 'greeting',
    template_name: 'dental_birthday_greeting',
    body: 'Hi {{patient_name}}, wishing you a very Happy Birthday! May this special day bring\nyou lots of joy and smiles. We look forward to keeping your smile healthy\nat {{clinic_name}}. Have a wonderful day!',
    variables: { body: ['patient_name', 'clinic_name'], buttons: [] },
    language: 'en',
    sampleValues: { patient_name: 'Priya Sharma', clinic_name: 'Smile Dental Clinic' },
  },

  // ── 15. Festival Greeting (MARKETING) ──
  {
    channel: 'whatsapp',
    category: 'greeting',
    template_name: 'dental_festival_greeting',
    body: 'Hi {{patient_name}}, warm wishes to you and your family on the occasion of {{festival_name}}!\nMay this festive season bring happiness and good health.\nWith warm regards from the {{clinic_name}} team.',
    variables: { body: ['patient_name', 'festival_name', 'clinic_name'], buttons: [] },
    language: 'en',
    sampleValues: { patient_name: 'Priya Sharma', festival_name: 'Diwali', clinic_name: 'Smile Dental Clinic' },
  },

  // ── 16. National Day Greeting (MARKETING) ──
  {
    channel: 'whatsapp',
    category: 'greeting',
    template_name: 'dental_national_day_greeting',
    body: 'Hi {{patient_name}}, the team at {{clinic_name}} wishes you a very Happy {{occasion_label}}!\nMay this special occasion bring joy, pride, and good health\nto you and your loved ones.',
    variables: { body: ['patient_name', 'clinic_name', 'occasion_label'], buttons: [] },
    language: 'en',
    sampleValues: { patient_name: 'Priya Sharma', clinic_name: 'Smile Dental Clinic', occasion_label: '80th Independence Day' },
  },

  // ── 17. Health Awareness ──
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'dental_health_awareness',
    body: 'Hi {{patient_name}}, on this {{health_day}}, {{clinic_name}} reminds you that your oral health is our priority.\nRegular dental checkups help prevent issues before they start.\nBook your next visit today!',
    variables: { body: ['patient_name', 'health_day', 'clinic_name'], buttons: [] },
    language: 'en',
    sampleValues: { patient_name: 'Priya Sharma', health_day: 'World Oral Health Day', clinic_name: 'Smile Dental Clinic' },
  },

  // ── 18. Clinic Offer (MARKETING) ──
  {
    channel: 'whatsapp',
    category: 'campaign',
    template_name: 'dental_clinic_offer',
    body: 'Hi {{patient_name}}, here is a special offer from {{clinic_name}}. {{offer_details}} Don\'t miss out — call us or visit us today!',
    variables: { body: ['patient_name', 'clinic_name', 'offer_details'], buttons: [] },
    language: 'en',
    sampleValues: { patient_name: 'Priya Sharma', clinic_name: 'Smile Dental Clinic', offer_details: 'Get 20% off on teeth whitening this month!' },
  },

  // ─── Platform / SaaS billing reminders (sent to clinic admin) ───
  // These are utility messages from the SaaS platform to the clinic owner
  // about their subscription. Recipient is the clinic's admin user, not a
  // patient — sent via CommunicationService.sendStaffWhatsAppTemplate.
  // All names are prefixed `platform_` and hidden from clinic-facing UI
  // via PLATFORM_TEMPLATE_NAMES.

  // ── 19. Trial Ending Soon (admin) ──
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'platform_trial_ending_soon',
    body: 'Hello Dr. {{Dentist_Name}},\n\nYour Smart Dental Desk free trial is ending on {{Trial_End_Date}}.\n\nTo continue using appointments, reminders, and clinic management features without interruption, please upgrade your plan.\n\nLet us know if you need any assistance.\n\n– Smart Dental Desk',
    variables: { body: ['Dentist_Name', 'Trial_End_Date'], buttons: [] },
    language: 'en',
    sampleValues: { Dentist_Name: 'Anil Mehta', Trial_End_Date: '15 May 2026' },
  },

  // ── 20. Trial Expired (admin) ──
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'platform_trial_expired',
    body: 'Hello Dr. {{Dentist_Name}},\n\nYour free trial has ended today.\n\nTo continue accessing your clinic data and managing appointments, please upgrade your plan.\n\nWe’re here to help if you need any assistance.\n\n– Smart Dental Desk',
    variables: { body: ['Dentist_Name'], buttons: [] },
    language: 'en',
    sampleValues: { Dentist_Name: 'Anil Mehta' },
  },

  // ── 21. Payment Reminder — Post Trial (admin) ──
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'platform_payment_reminder_post_trial',
    body: 'Hello Dr. {{Dentist_Name}},\n\nThis is a reminder to renew your Smart Dental Desk subscription.\n\nUpgrade now to continue managing your clinic smoothly without any disruptions.\n\nLet us know if you\'d like help with the process.\n\n– Smart Dental Desk',
    variables: { body: ['Dentist_Name'], buttons: [] },
    language: 'en',
    sampleValues: { Dentist_Name: 'Anil Mehta' },
  },

  // ── 22. Subscription Renewal Reminder (admin) ──
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'platform_subscription_renewal_reminder',
    body: 'Hello Dr. {{Dentist_Name}},\n\nYour Smart Dental Desk subscription is due for renewal on {{Renewal_Date}}.\n\nPlease renew in time to avoid any interruption in services.\n\nFeel free to reach out if you need assistance.\n\n– Smart Dental Desk',
    variables: { body: ['Dentist_Name', 'Renewal_Date'], buttons: [] },
    language: 'en',
    sampleValues: { Dentist_Name: 'Anil Mehta', Renewal_Date: '15 May 2026' },
  },

  // ── 23. Subscription Expired (admin) ──
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'platform_subscription_expired',
    body: 'Hello Dr. {{Dentist_Name}},\n\nYour Smart Dental Desk subscription has expired.\n\nRenew your plan to regain access to appointments, patient records, and reminders.\n\nWe\'re happy to assist you if needed.\n\n– Smart Dental Desk',
    variables: { body: ['Dentist_Name'], buttons: [] },
    language: 'en',
    sampleValues: { Dentist_Name: 'Anil Mehta' },
  },

  // ── 24. Final Payment Reminder — High Priority (admin) ──
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'platform_final_payment_reminder',
    body: 'Hello Dr. {{Dentist_Name}},\n\nYour access to Smart Dental Desk is currently inactive.\n\nRenew your subscription today to continue managing appointments, patient records, and automated reminders without disruption.\n\nLet us know if you’d like help getting started again.\n\n– Smart Dental Desk',
    variables: { body: ['Dentist_Name'], buttons: [] },
    language: 'en',
    sampleValues: { Dentist_Name: 'Anil Mehta' },
  },

  // ── 25. Consent Signature Request (sent to the patient) ──
  // Patient receives a secure link, opens it on their phone, reads the
  // consent PDF, verifies an OTP, then signs digitally — no clinic tablet
  // needed. The link is single-use and expires in 72 hours.
  //
  // Numbered placeholders (Meta-approved format):
  //   {{1}} = patient_name, {{2}} = clinic_name, {{3}} = procedure,
  //   {{4}} = link,         {{5}} = phone
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'dental_consent_signature_request',
    body: 'Hi {{1}}, {{2}} has shared a consent form for your upcoming {{3}}.\n\nPlease review and sign securely on your phone:\n{{4}}\n\nLink expires in 72 hours. For any questions, contact us at {{5}}.',
    variables: { body: ['patient_name', 'clinic_name', 'procedure', 'link', 'phone'], buttons: [] },
    language: 'en_US',
    sampleValues: { patient_name: 'Priya Sharma', clinic_name: 'Smile Dental Clinic', procedure: 'Root Canal Treatment', link: 'https://app.example.com/consent/sign/abc123', phone: '9876543210' },
  },

  // ── 26. Consent Signature OTP (sent to patient when verifying) ──
  // Meta-approved Authentication template. Numbered placeholders:
  //   {{1}} = otp, {{2}} = clinic_name
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'dental_consent_otp',
    body: 'OTP Code: {{1}}. This is your OTP code for {{2}}. For your security, do not share this code.',
    variables: { body: ['otp', 'clinic_name'], buttons: [] },
    language: 'en_US',
    sampleValues: { otp: '482917', clinic_name: 'Smile Dental Clinic' },
  },
];

export async function seedDefaultTemplates(prisma: PrismaService): Promise<void> {
  logger.log('Seeding default message templates...');

  let created = 0;
  let updated = 0;
  for (const template of DEFAULT_TEMPLATES) {
    const existing = await prisma.messageTemplate.findFirst({
      where: {
        clinic_id: null, // system template
        template_name: template.template_name,
        channel: template.channel,
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
          footer: template.footer,
          body: template.body,
          variables: template.variables as object,
          language: template.language,
          is_active: true,
        } as any,
      });
      created++;
    } else if (template.channel === 'whatsapp') {
      // Always sync body, variables, footer, category, language for WhatsApp templates
      await prisma.messageTemplate.update({
        where: { id: existing.id },
        data: {
          body: template.body,
          variables: template.variables as object,
          footer: template.footer ?? null,
          category: template.category,
          language: template.language,
        } as any,
      });
      updated++;
    }
  }

  // ─── Clean up stale system WhatsApp templates ───
  // Remove system WhatsApp templates that are no longer in the seed list.
  // This does NOT affect clinic-owned templates (clinic_id != null).
  const currentWANames = DEFAULT_TEMPLATES
    .filter((t) => t.channel === 'whatsapp')
    .map((t) => t.template_name);

  const stale = await prisma.messageTemplate.findMany({
    where: {
      clinic_id: null,
      channel: 'whatsapp',
      template_name: { notIn: currentWANames },
    },
    select: { id: true, template_name: true },
  });

  if (stale.length > 0) {
    await prisma.messageTemplate.deleteMany({
      where: { id: { in: stale.map((s) => s.id) } },
    });
    logger.log(`Removed ${stale.length} stale system WhatsApp templates: ${stale.map((s) => s.template_name).join(', ')}`);
  }

  logger.log(`Seeded ${created} new templates, updated ${updated} WhatsApp templates (${DEFAULT_TEMPLATES.length - created - updated} unchanged)`);
}

/**
 * Get the sample values for a WhatsApp seed template by name.
 * Used by the base-templates API to provide default sample values.
 */
export function getWhatsAppSeedSampleValues(templateName: string): Record<string, string> | undefined {
  const seed = DEFAULT_TEMPLATES.find(
    (t) => t.channel === 'whatsapp' && t.template_name === templateName,
  );
  return seed?.sampleValues;
}

/**
 * Get the Meta category for a WhatsApp seed template.
 */
export function getWhatsAppSeedMetaCategory(templateName: string): string {
  const seed = DEFAULT_TEMPLATES.find(
    (t) => t.channel === 'whatsapp' && t.template_name === templateName,
  );
  if (!seed) return 'UTILITY';
  return seed.category === 'campaign' || seed.category === 'greeting' || seed.category === 'referral'
    ? 'MARKETING' : 'UTILITY';
}
