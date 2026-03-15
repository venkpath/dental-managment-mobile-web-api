# Backup & Restore Procedures

## Backup Overview

- **Automated**: Daily at 2:00 AM via `BackupService` cron job
- **Manual**: POST `/api/v1/backup` (super_admin only)
- **Format**: gzipped SQL dumps (`dental_backup_{timestamp}.sql.gz`)
- **Retention**: 30 days (configurable via `BACKUP_RETENTION_DAYS`)
- **Storage**: Local filesystem at `BACKUP_DIR` (default: `/backups`)

## Restore Procedure

### 1. List available backups
```bash
# Via API
curl -H "Authorization: Bearer <token>" https://api.example.com/api/v1/backup

# Via filesystem
ls -la /backups/
```

### 2. Restore from backup
```bash
# Decompress and restore
gunzip -c /backups/dental_backup_2026-03-15T02-00-00-000Z.sql.gz | psql "$DATABASE_URL"

# Or create a fresh database and restore
createdb dental_restored
gunzip -c /backups/dental_backup_2026-03-15T02-00-00-000Z.sql.gz | psql dental_restored
```

### 3. Verify restoration
```bash
# Connect and check tables
psql dental_restored -c "\dt"

# Check row counts for key tables
psql dental_restored -c "
  SELECT 'clinics' AS table_name, COUNT(*) FROM \"Clinic\"
  UNION ALL
  SELECT 'users', COUNT(*) FROM \"User\"
  UNION ALL
  SELECT 'patients', COUNT(*) FROM \"Patient\"
  UNION ALL
  SELECT 'appointments', COUNT(*) FROM \"Appointment\";
"
```

## Monthly Verification Checklist

- [ ] Download latest backup file
- [ ] Restore to a test database
- [ ] Verify all tables are present
- [ ] Verify row counts match production
- [ ] Verify relationships/foreign keys are intact
- [ ] Test a sample query against restored data
- [ ] Document verification date and result

## Cloud Storage (Production)

For production, configure uploads to S3/R2:

```bash
# Environment variables
BACKUP_UPLOAD_S3=true
AWS_S3_BUCKET=dental-backups
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
```

## Disaster Recovery Timeline

| Scenario | RTO | RPO | Procedure |
|---|---|---|---|
| Database corruption | < 1 hour | 24 hours | Restore from latest backup |
| Accidental deletion | < 30 min | 24 hours | Restore specific tables |
| Complete infra failure | < 4 hours | 24 hours | New infra + restore backup |
