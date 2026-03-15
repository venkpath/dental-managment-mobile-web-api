import { Logger } from '@nestjs/common';

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
];

const RECOMMENDED_ENV_VARS = [
  'REDIS_HOST',
  'CORS_ORIGIN',
  'SMTP_HOST',
];

export function validateEnvVars(): void {
  const logger = new Logger('EnvValidation');
  const missing: string[] = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(', ')}`);
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Warn about recommended but missing vars
  for (const envVar of RECOMMENDED_ENV_VARS) {
    if (!process.env[envVar]) {
      logger.warn(`Recommended environment variable not set: ${envVar}`);
    }
  }

  // Warn if JWT secret is the default value
  if (process.env['JWT_SECRET'] === 'change-me-to-a-strong-secret-in-production') {
    logger.warn('JWT_SECRET is using the default value — change it in production!');
  }
}
