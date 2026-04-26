import type { JwtPayload } from '../interfaces/jwt-payload.interface.js';

/**
 * If the authenticated user is a dentist, force-scopes the query to their
 * own records by overriding `dentist_id` with `user.sub`. Returns the same
 * query object (mutated) for fluent use.
 *
 * Role check is case-insensitive (DB has historically used both "Dentist"
 * and "dentist"). Non-dentist roles (Admin, Receptionist, etc.) are
 * untouched and may pass any dentist_id filter as before.
 */
export function applyDentistScope<T extends { dentist_id?: string | null }>(
  query: T,
  user: JwtPayload | undefined | null,
): T {
  if (!user) return query;
  if (typeof user.role === 'string' && user.role.trim().toLowerCase() === 'dentist') {
    query.dentist_id = user.sub;
  }
  return query;
}

/**
 * Convenience predicate — returns true when the JWT user is a dentist.
 */
export function isDentistUser(user: JwtPayload | undefined | null): boolean {
  return !!user && typeof user.role === 'string' && user.role.trim().toLowerCase() === 'dentist';
}
