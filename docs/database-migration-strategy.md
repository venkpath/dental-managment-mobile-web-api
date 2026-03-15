# Database Migration Strategy

## Overview

Prisma Migrate handles all schema changes in a controlled, versioned manner.

## Environments

| Environment | Migration Strategy | When |
|---|---|---|
| **Development** | `prisma migrate dev` | During local development |
| **Staging** | `prisma migrate deploy` | Auto on deploy from `develop` branch |
| **Production** | `prisma migrate deploy` | Auto on deploy from `main` branch |

## Commands

### Development
```bash
# Create a new migration after schema changes
cd dental-backend
npx prisma migrate dev --name descriptive_name

# Reset database (WARNING: destroys all data)
npx prisma migrate reset

# Generate Prisma client only (no migration)
npx prisma generate
```

### CI/CD (Staging & Production)
```bash
# Apply pending migrations (non-interactive, safe for CI)
npx prisma migrate deploy

# Verify migration status
npx prisma migrate status
```

## Rollback Procedure

Prisma does not support automatic rollbacks. Follow this procedure:

### 1. Identify the failing migration
```bash
npx prisma migrate status
```

### 2. Create a corrective migration
```bash
# Fix the schema.prisma file
# Then create a new migration that corrects the issue
npx prisma migrate dev --name fix_migration_name
```

### 3. Emergency rollback (manual SQL)
If a migration must be fully reverted:
1. Connect to the database directly
2. Execute the reverse SQL operations
3. Remove the migration record from `_prisma_migrations` table
4. Document the rollback in the team's incident log

```sql
-- Example: Remove a migration record
DELETE FROM "_prisma_migrations" WHERE migration_name = '20260312000000_problematic_migration';
```

## Seed Data

### Staging
```bash
npx prisma db seed
```

The seed script (`prisma/seed.ts`) creates:
- Default clinic, branch, and admin user
- Sample plans and features
- Demo data for testing

### Production
- **Never** run seeds in production
- Use admin APIs or manual SQL for initial setup

## Pre-deployment Checklist

- [ ] Migration tested locally with `prisma migrate dev`
- [ ] Migration tested on staging database
- [ ] Backward-compatible changes (add columns as nullable first)
- [ ] No data-destructive operations without explicit team approval
- [ ] Backup taken before production deployment (see backup docs)
- [ ] Rollback plan documented for complex migrations

## Naming Convention

Migrations follow the pattern: `YYYYMMDDHHMMSS_description`

Examples:
- `20260306142313_add_patient_model`
- `20260312000000_add_branch_scheduling_settings`
- `20260314162100_add_dnd_fields_to_communication_settings`
