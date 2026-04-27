declare const _default: (() => {
    port: number;
    nodeEnv: string;
    jwtSecret: string;
    jwtExpiresIn: string;
    frontendUrl: string;
    sentryDsn: string;
    smtp: {
        host: string;
        port: number;
        user: string;
        pass: string;
        from: string;
        secure: boolean;
    };
    sms: {
        apiKey: string;
        senderId: string;
        entityId: string;
        defaultDltTemplateId: string;
        dltTemplateBody: string;
    };
    whatsapp: {
        accessToken: string;
        phoneNumberId: string;
        wabaId: string;
        webhookVerifyToken: string;
        appSecret: string;
    };
    adminWhatsappPhone: string;
    adminEmail: string;
    facebook: {
        appId: string;
        appSecret: string;
    };
    google: {
        clientId: string;
        clientSecret: string;
        redirectUri: string;
    };
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    port: number;
    nodeEnv: string;
    jwtSecret: string;
    jwtExpiresIn: string;
    frontendUrl: string;
    sentryDsn: string;
    smtp: {
        host: string;
        port: number;
        user: string;
        pass: string;
        from: string;
        secure: boolean;
    };
    sms: {
        apiKey: string;
        senderId: string;
        entityId: string;
        defaultDltTemplateId: string;
        dltTemplateBody: string;
    };
    whatsapp: {
        accessToken: string;
        phoneNumberId: string;
        wabaId: string;
        webhookVerifyToken: string;
        appSecret: string;
    };
    adminWhatsappPhone: string;
    adminEmail: string;
    facebook: {
        appId: string;
        appSecret: string;
    };
    google: {
        clientId: string;
        clientSecret: string;
        redirectUri: string;
    };
}>;
export default _default;
