# Phase 2 Subscriber Deduplication - Execution Guide

## ⚠️ CRITICAL: Read Before Executing

This migration will:
1. Identify duplicate phone numbers in subscriptions table
2. Keep the OLDEST record (by created_at) for each phone number
3. Delete all newer duplicate records
4. Add a unique constraint to prevent future duplicates
5. Log all deletions in an audit table

**Estimated Time**: 5-10 minutes  
**Risk Level**: Medium (deletes data, but with audit trail)  
**Reversible**: Yes (via audit log)

---

## Pre-Execution Checklist

- [ ] Database backup completed
- [ ] Investigation queries run
- [ ] Stakeholders notified
- [ ] Maintenance window scheduled (if needed)
- [ ] Rollback plan reviewed

---

## Step 1: Investigation (5 minutes)

Run the investigation script to understand current state:

```bash
# In Supabase SQL Editor or psql
psql $DATABASE_URL < supabase/migrations/20260124_investigate_deduplication.sql
```

**Key Questions to Answer**:
1. How many duplicate phone numbers exist?
2. How many total records will be deleted?
3. Does the unique constraint already exist?
4. Is there existing audit log data?

**Expected Output**:
```
total_subscribers: 1000
unique_phones_with_duplicates: 50
total_duplicate_records_to_remove: 75
```

**Decision Point**: If duplicates > 100, consider notifying users or reviewing data quality.

---

## Step 2: Backup (2 minutes)

Create a backup of the subscriptions table:

```sql
-- Run in Supabase SQL Editor
CREATE TABLE subscriptions_backup_20260124 AS
SELECT * FROM subscriptions;

-- Verify backup
SELECT 
    (SELECT COUNT(*) FROM subscriptions) as original,
    (SELECT COUNT(*) FROM subscriptions_backup_20260124) as backup,
    (SELECT COUNT(*) FROM subscriptions) = 
    (SELECT COUNT(*) FROM subscriptions_backup_20260124) as match;
```

**Expected**: `match = true`

---

## Step 3: Dry Run (3 minutes)

Preview which records will be kept vs deleted:

```sql
-- Records to KEEP (oldest)
WITH duplicates AS (
    SELECT 
        phone_number,
        (ARRAY_AGG(id ORDER BY created_at ASC))[1] as keep_id
    FROM subscriptions
    GROUP BY phone_number
    HAVING COUNT(*) > 1
)
SELECT 
    s.phone_number,
    s.created_at,
    'KEEP' as action
FROM subscriptions s
JOIN duplicates d ON s.phone_number = d.phone_number AND s.id = d.keep_id
ORDER BY s.phone_number;

-- Records to DELETE (newer)
WITH duplicates AS (
    SELECT 
        phone_number,
        (ARRAY_AGG(id ORDER BY created_at ASC))[1] as keep_id
    FROM subscriptions
    GROUP BY phone_number
    HAVING COUNT(*) > 1
)
SELECT 
    s.phone_number,
    s.created_at,
    'DELETE' as action
FROM subscriptions s
JOIN duplicates d ON s.phone_number = d.phone_number AND s.id != d.keep_id
ORDER BY s.phone_number;
```

**Review**: Ensure the logic is correct (oldest records kept).

---

## Step 4: Execute Migration (2 minutes)

Run the main migration script:

```bash
# In Supabase SQL Editor
psql $DATABASE_URL < supabase/migrations/20260124_deduplicate_subscribers.sql
```

**Watch for**:
- No errors during execution
- Verification query at end shows results
- Audit log populated

**Expected Output**:
```
total_subscribers: 925
unique_phones: 925
duplicates_removed: 75
```

---

## Step 5: Verification (3 minutes)

Run post-migration checks:

```sql
-- 1. No duplicates remain
SELECT phone_number, COUNT(*) 
FROM subscriptions 
GROUP BY phone_number 
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- 2. Unique constraint exists
SELECT conname 
FROM pg_constraint 
WHERE conrelid = 'subscriptions'::regclass 
AND conname = 'subscriptions_phone_unique';
-- Should return 1 row

-- 3. Audit log populated
SELECT COUNT(*) FROM subscriber_deduplication_log;
-- Should match number of phone numbers that had duplicates

-- 4. Test constraint (should fail)
INSERT INTO subscriptions (phone_number, opted_in) 
VALUES ('+27999999999', true), ('+27999999999', true);
-- Should error: duplicate key value violates unique constraint

-- Clean up test
DELETE FROM subscriptions WHERE phone_number = '+27999999999';
```

---

## Step 6: Monitoring (Ongoing)

Monitor for issues:

```sql
-- Check for constraint violations in logs
SELECT * FROM subscriber_deduplication_log
ORDER BY deduplicated_at DESC
LIMIT 10;

-- Monitor new subscription attempts
SELECT 
    COUNT(*) as total_subscriptions,
    COUNT(DISTINCT phone_number) as unique_phones,
    COUNT(*) - COUNT(DISTINCT phone_number) as would_be_duplicates
FROM subscriptions
WHERE created_at > NOW() - INTERVAL '1 hour';
```

---

## Rollback Procedure (If Needed)

**Only execute if migration fails or causes issues**

```sql
-- Step 1: Drop unique constraint
ALTER TABLE subscriptions 
DROP CONSTRAINT IF EXISTS subscriptions_phone_unique;

-- Step 2: Restore deleted records
INSERT INTO subscriptions (id, phone_number, opted_in, created_at)
SELECT 
    unnest(deleted_ids),
    phone_number,
    true,
    NOW()
FROM subscriber_deduplication_log;

-- Step 3: Verify restoration
SELECT 
    (SELECT COUNT(*) FROM subscriptions) as current_count,
    (SELECT COUNT(*) FROM subscriptions_backup_20260124) as backup_count;
-- Should match

-- Step 4: Drop audit log (optional)
DROP TABLE IF EXISTS subscriber_deduplication_log;

-- Step 5: Drop index
DROP INDEX IF EXISTS idx_subscriptions_phone;
```

---

## Cleanup (After 7 Days)

Once migration is confirmed successful:

```sql
-- Remove backup table
DROP TABLE IF EXISTS subscriptions_backup_20260124;

-- Keep audit log for compliance
-- DO NOT DROP subscriber_deduplication_log
```

---

## Troubleshooting

### Error: "function min(uuid) does not exist"
**Solution**: Already fixed in migration. Uses `ARRAY_AGG` instead.

### Error: "unique constraint violation"
**Cause**: Duplicate phone numbers still exist  
**Solution**: Re-run investigation queries to identify remaining duplicates

### Error: "permission denied"
**Cause**: Insufficient database permissions  
**Solution**: Run as database owner or with SUPERUSER role

### Warning: "too many duplicates"
**Cause**: Data quality issues  
**Solution**: Review data source and implement validation at input

---

## Success Criteria

✅ All checks must pass:

1. **No Duplicates**: `SELECT COUNT(*) FROM (SELECT phone_number FROM subscriptions GROUP BY phone_number HAVING COUNT(*) > 1) x;` returns 0
2. **Constraint Active**: Attempting to insert duplicate fails with constraint error
3. **Audit Log**: `SELECT COUNT(*) FROM subscriber_deduplication_log;` > 0 (if duplicates existed)
4. **Index Created**: `SELECT COUNT(*) FROM pg_indexes WHERE indexname = 'idx_subscriptions_phone';` returns 1
5. **No Data Loss**: Total unique phone numbers before = total subscribers after

---

## Communication Template

**Before Migration**:
```
Subject: Scheduled Maintenance - Subscriber Data Cleanup

We will be performing routine database maintenance to remove duplicate 
subscriber records. This will:
- Improve system performance
- Ensure data integrity
- Prevent future duplicates

Duration: 10 minutes
Impact: None (read-only operations continue)
Rollback: Available if needed
```

**After Migration**:
```
Subject: Maintenance Complete - Subscriber Data Cleanup

Database maintenance completed successfully:
- Removed X duplicate records
- Added data integrity constraints
- Improved query performance
- All systems operational

No action required from users.
```

---

## Phase 2 Day 1 Status

- [x] Migration script created
- [x] Investigation script created
- [x] Execution guide created
- [x] UUID MIN() error fixed
- [ ] Migration executed in production
- [ ] Verification completed
- [ ] Monitoring active

**Next**: Execute migration in production environment
