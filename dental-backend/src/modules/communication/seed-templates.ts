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
  body: string;
  variables: string[] | { body: string[]; buttons: WhatsAppButtonSeed[] };
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
  // ═══════════════════════════════════════════════════════════════
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'dental_appointment_confirmation',
    body: 'Hi {{patient_name}}, your appointment is confirmed with {{doctor_name}} on {{date}} at {{time}} at {{clinic_name}}. For queries call {{phone}}. Please arrive 10 minutes early. If you need to reschedule, call us at {{phone}}. Thank you!',
    variables: {
      body: ['patient_name', 'doctor_name', 'date', 'time', 'clinic_name', 'phone'],
      buttons: [],
    },
    language: 'en',
  },
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'dental_appointment_reminder',
    body: 'Hi {{patient_name}}, reminder: appointment on {{date}} at {{time}} at {{clinic_name}} with {{doctor_name}}. Call {{phone}} to reschedule.',
    variables: {
      body: ['patient_name', 'date', 'time', 'clinic_name', 'doctor_name', 'phone'],
      buttons: [],
    },
    language: 'en',
  },
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'dental_appointment_cancel',
    body: 'Hi {{patient_name}}, your appointment at {{clinic_name}} on {{date}} at {{time}} has been cancelled. Call {{phone}} to rebook.',
    variables: {
      body: ['patient_name', 'clinic_name', 'date', 'time', 'phone'],
      buttons: [],
    },
    language: 'en',
  },
  {
    channel: 'whatsapp',
    category: 'transactional',
    template_name: 'dental_appointment_rescheduled',
    body: 'Hi {{patient_name}}, your appointment has been rescheduled from {{previous_time}} to {{new_time}} at {{clinic_name}}. Call {{phone}} for queries.',
    variables: {
      body: ['patient_name', 'previous_time', 'new_time', 'clinic_name', 'phone'],
      buttons: [],
    },
    language: 'en',
  },
  {
    channel: 'whatsapp',
    category: 'campaign',
    template_name: 'dental_clinic_offer',
    body: 'Hi {{patient_name}}, We have an exciting offer for you from {{clinic_name}}! {{offer_details}} To avail this offer, book your appointment by calling us at {{phone}} during clinic hours. Hurry, this offer is for a limited time only!',
    variables: {
      body: ['patient_name', 'clinic_name', 'offer_details', 'phone'],
      buttons: [],
    },
    language: 'en',
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
          variables: template.variables as object,
          language: template.language,
          is_active: true,
        },
      });
      created++;
    } else if (template.channel === 'whatsapp') {
      // Always sync variables for WhatsApp templates so button configs stay current
      await prisma.messageTemplate.update({
        where: { id: existing.id },
        data: { variables: template.variables as object },
      });
      updated++;
    }
  }

  logger.log(`Seeded ${created} new templates, updated ${updated} WhatsApp templates (${DEFAULT_TEMPLATES.length - created - updated} unchanged)`);
}
