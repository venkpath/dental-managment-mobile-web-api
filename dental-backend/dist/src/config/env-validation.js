"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnvVars = validateEnvVars;
const common_1 = require("@nestjs/common");
const REQUIRED_ENV_VARS = [
    'DATABASE_URL',
    'JWT_SECRET',
];
const RECOMMENDED_ENV_VARS = [
    'REDIS_HOST',
    'CORS_ORIGIN',
    'SMTP_HOST',
];
const INSECURE_DEFAULTS = {
    JWT_SECRET: 'change-me-to-a-strong-secret-in-production',
    ENCRYPTION_KEY: 'development-only-key-change-in-prod',
    SUPER_ADMIN_PASSWORD: 'Admin@123',
};
const MIN_SECRET_LENGTH = 32;
function validateEnvVars() {
    const logger = new common_1.Logger('EnvValidation');
    const isProd = process.env['NODE_ENV'] === 'production';
    const missing = [];
    for (const envVar of REQUIRED_ENV_VARS) {
        if (!process.env[envVar]) {
            missing.push(envVar);
        }
    }
    if (missing.length > 0) {
        logger.error(`Missing required environment variables: ${missing.join(', ')}`);
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    for (const envVar of RECOMMENDED_ENV_VARS) {
        if (!process.env[envVar]) {
            logger.warn(`Recommended environment variable not set: ${envVar}`);
        }
    }
    const fatal = [];
    const flag = (message) => {
        if (isProd) {
            fatal.push(message);
        }
        else {
            logger.warn(`${message} (allowed in non-production)`);
        }
    };
    const jwtSecret = process.env['JWT_SECRET'];
    if (jwtSecret === INSECURE_DEFAULTS['JWT_SECRET']) {
        flag('JWT_SECRET is set to the insecure default value — set a strong, random secret.');
    }
    else if (jwtSecret && jwtSecret.length < MIN_SECRET_LENGTH) {
        flag(`JWT_SECRET is too short (<${MIN_SECRET_LENGTH} chars) — use a longer random secret.`);
    }
    const encryptionKey = process.env['ENCRYPTION_KEY'];
    if (!encryptionKey) {
        flag('ENCRYPTION_KEY is not set — the app would fall back to a hardcoded development key.');
    }
    else if (encryptionKey === INSECURE_DEFAULTS['ENCRYPTION_KEY']) {
        flag('ENCRYPTION_KEY is set to the insecure default value — set a strong, random key.');
    }
    const superAdminPassword = process.env['SUPER_ADMIN_PASSWORD'];
    if (!superAdminPassword || superAdminPassword === INSECURE_DEFAULTS['SUPER_ADMIN_PASSWORD']) {
        logger.warn('SUPER_ADMIN_PASSWORD is unset or using the insecure default — set it before first seed and rotate any existing default admin password.');
    }
    if (fatal.length > 0) {
        const detail = fatal.map((m) => `  - ${m}`).join('\n');
        logger.error(`Insecure configuration detected in production:\n${detail}`);
        throw new Error(`Insecure production configuration:\n${detail}`);
    }
}
//# sourceMappingURL=env-validation.js.map