"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("@nestjs/config");
exports.default = (0, config_1.registerAs)('app', () => ({
    port: parseInt(process.env['PORT'] || '3000', 10),
    nodeEnv: process.env['NODE_ENV'] || 'development',
    jwtSecret: process.env['JWT_SECRET'] || 'change-me-to-a-strong-secret-in-production',
    jwtExpiresIn: process.env['JWT_EXPIRES_IN'] || '1d',
    frontendUrl: process.env['FRONTEND_URL'] || 'http://localhost:3001',
    sentryDsn: process.env['SENTRY_DSN'] || '',
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
        dltTemplateBody: process.env['SMS_DLT_TEMPLATE_BODY'] || '',
    },
    whatsapp: {
        accessToken: process.env['WHATSAPP_ACCESS_TOKEN'] || '',
        phoneNumberId: process.env['WHATSAPP_PHONE_NUMBER_ID'] || '',
        wabaId: process.env['WHATSAPP_WABA_ID'] || '',
        webhookVerifyToken: process.env['WHATSAPP_WEBHOOK_VERIFY_TOKEN'] || '',
        appSecret: process.env['WHATSAPP_APP_SECRET'] || '',
    },
    adminWhatsappPhone: process.env['ADMIN_WHATSAPP_PHONE'] || '916366767512',
    adminEmail: process.env['ADMIN_EMAIL'] || 'prasanthshanmugam10@gmail.com',
    facebook: {
        appId: process.env['FACEBOOK_APP_ID'] || '',
        appSecret: process.env['FACEBOOK_APP_SECRET'] || '',
    },
    google: {
        clientId: process.env['GOOGLE_CLIENT_ID'] || '',
        clientSecret: process.env['GOOGLE_CLIENT_SECRET'] || '',
        redirectUri: process.env['GOOGLE_REDIRECT_URI'] || 'http://localhost:3000/api/google-reviews/oauth/callback',
    },
}));
//# sourceMappingURL=app.config.js.map