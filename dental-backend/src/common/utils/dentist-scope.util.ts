import type { JwtPayload } from '../interfaces/jwt-payload.interface.js';

// Roles that perform clinical procedures and own their own appointment/treatment scope.
// Both behave identically for row-level scoping; difference is organizational (Consultant
// is a visiting expert, Dentist is a regular practitioner).
function isClinicalRole(role: unknown): boolean {
  if (typeof role !== 'string') return false;
  const normalized = role.trim().toLowerCase();
  return normalized === 'dentist' || normalized === 'consultant';
}

/**
 * If the authenticated user is a clinical role (Dentist or Consultant),
 * force-scopes the query to their own records by overriding `dentist_id`
 * with `user.sub`. Returns the same query object (mutated) for fluent use.
 *
 * Role check is case-insensitive (DB has historically used mixed case).
 * Non-clinical roles (Admin, Receptionist, etc.) are untouched and may
 * pass any dentist_id filter as before.
 */
export function applyDentistScope<T extends { dentist_id?: string | null }>(
  query: T,
  user: JwtPayload | undefined | null,
): T {
  if (!user) return query;
  if (isClinicalRole(user.role)) {
    query.dentist_id = user.sub;
  }
  return query;
}

/**
 * Convenience predicate — returns true when the JWT user is a clinical
 * role (Dentist or Consultant).
 */
export function isDentistUser(user: JwtPayload | undefined | null): boolean {
  return !!user && isClinicalRole(user.role);
}
