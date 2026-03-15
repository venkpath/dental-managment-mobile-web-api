import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export function initSentry(): void {
  const dsn = process.env['SENTRY_DSN'];
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env['NODE_ENV'] || 'development',
    release: process.env['SENTRY_RELEASE'] || 'dental-backend@' + (process.env['npm_package_version'] || '0.0.1'),
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.2 : 1.0,
    profilesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,
  });
}
