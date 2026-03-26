declare const _default: (() => {
    port: number;
    nodeEnv: string;
    jwtSecret: string;
    jwtExpiresIn: string;
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
    facebook: {
        appId: string;
        appSecret: string;
    };
}) & import("@nestjs/config").ConfigFactoryKeyHost<{
    port: number;
    nodeEnv: string;
    jwtSecret: string;
    jwtExpiresIn: string;
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
    facebook: {
        appId: string;
        appSecret: string;
    };
}>;
export default _default;
