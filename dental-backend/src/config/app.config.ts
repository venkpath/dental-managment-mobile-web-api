import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env['PORT'] || '3000', 10),
  nodeEnv: process.env['NODE_ENV'] || 'development',
  jwtSecret: process.env['JWT_SECRET'] || 'change-me-to-a-strong-secret-in-production',
  jwtExpiresIn: process.env['JWT_EXPIRES_IN'] || '1d',
  smtp: {
    host: process.env['SMTP_HOST'] || '',
    port: parseInt(process.env['SMTP_PORT'] || '587', 10),
    user: process.env['SMTP_USER'] || '',
    pass: process.env['SMTP_PASS'] || '',
    from: process.env['SMTP_FROM'] || '',
    secure: process.env['SMTP_SECURE'] === 'true',
  },
  sms: {
    apiKey: process.env['SMS_API_KEY'] || '',
    senderId: process.env['SMS_SENDER_ID'] || '',
    entityId: process.env['SMS_ENTITY_ID'] || '',
    defaultDltTemplateId: process.env['SMS_DEFAULT_DLT_TEMPLATE_ID'] || '',
  },
}));
