-- Phase 2 Day 1: Subscriber Deduplication Investigation & Testing
-- Run this BEFORE the migration to understand the data

-- ============================================
-- INVESTIGATION: Check Current State
-- ============================================

-- 1. Count total subscribers
SELECT COUNT(*) as total_subscribers FROM subscriptions;

-- 2. Check for duplicates
SELECT 
    phone_number,
    COUNT(*) as duplicate_count,
    ARRAY_AGG(id ORDER BY created_at ASC) as all_ids,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM subscriptions
GROUP BY phone_number
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 3. Count how many duplicates exist
WITH duplicate_counts AS (
    SELECT phone_number, COUNT(*) as cnt
    FROM subscriptions
    GROUP BY phone_number
    HAVING COUNT(*) > 1
)
SELECT 
    COUNT(*) as unique_phones_with_duplicates,
    SUM(cnt - 1) as total_duplicate_records_to_remove
FROM duplicate_counts;

-- 4. Check if unique constraint already exists
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'subscriptions'::regclass
AND conname LIKE '%phone%';

-- 5. Check if audit log table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'subscriber_deduplication_log'
) as audit_log_exists;

-- ============================================
-- DRY RUN: Preview what will be deleted
-- ============================================

-- Show which records will be KEPT (oldest by created_at)
WITH duplicates AS (
    SELECT 
        phone_number,
        (ARRAY_AGG(id ORDER BY created_at ASC))[1] as keep_id,
        COUNT(*) as dup_count
    FROM subscriptions
    GROUP BY phone_number
    HAVING COUNT(*) > 1
)
SELECT 
    s.id,
    s.phone_number,
    s.created_at,
    s.opted_in,
    'KEEP' as action
FROM subscriptions s
JOIN duplicates d ON s.phone_number = d.phone_number AND s.id = d.keep_id
ORDER BY s.phone_number, s.created_at;

-- Show which records will be DELETED
WITH duplicates AS (
    SELECT 
        phone_number,
        (ARRAY_AGG(id ORDER BY created_at ASC))[1] as keep_id,
        COUNT(*) as dup_count
    FROM subscriptions
    GROUP BY phone_number
    HAVING COUNT(*) > 1
)
SELECT 
    s.id,
    s.phone_number,
    s.created_at,
    s.opted_in,
    'DELETE' as action
FROM subscriptions s
JOIN duplicates d ON s.phone_number = d.phone_number AND s.id != d.keep_id
ORDER BY s.phone_number, s.created_at;

-- ============================================
-- BACKUP: Create backup before migration
-- ============================================

-- Create backup table
CREATE TABLE IF NOT EXISTS subscriptions_backup_20260124 AS
SELECT * FROM subscriptions;

-- Verify backup
SELECT 
    (SELECT COUNT(*) FROM subscriptions) as original_count,
    (SELECT COUNT(*) FROM subscriptions_backup_20260124) as backup_count,
    (SELECT COUNT(*) FROM subscriptions) = (SELECT COUNT(*) FROM subscriptions_backup_20260124) as counts_match;

-- ============================================
-- POST-MIGRATION VERIFICATION
-- ============================================

-- Run these queries AFTER the migration

-- 1. Verify no duplicates remain
SELECT 
    phone_number,
    COUNT(*) as count
FROM subscriptions
GROUP BY phone_number
HAVING COUNT(*) > 1;
-- Should return 0 rows

-- 2. Verify unique constraint exists
SELECT 
    conname,
    contype,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'subscriptions'::regclass
AND conname = 'subscriptions_phone_unique';
-- Should return 1 row

-- 3. Check audit log (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscriber_deduplication_log') THEN
        RAISE NOTICE 'Audit log exists. Querying...';
        PERFORM COUNT(*) FROM subscriber_deduplication_log;
    ELSE
        RAISE NOTICE 'Audit log does not exist yet. Will be created during migration.';
    END IF;
END $$;

-- If audit log exists, show summary
SELECT 
    COUNT(*) as total_deduplication_events,
    SUM(duplicate_count) as total_phone_numbers_deduplicated,
    SUM(array_length(deleted_ids, 1)) as total_records_deleted
FROM subscriber_deduplication_log
WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscriber_deduplication_log');

-- 4. View audit log details (only if table exists)
SELECT 
    phone_number,
    duplicate_count,
    array_length(deleted_ids, 1) as records_deleted,
    kept_id,
    deduplicated_at
FROM subscriber_deduplication_log
WHERE EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscriber_deduplication_log')
ORDER BY duplicate_count DESC, deduplicated_at DESC
LIMIT 10;

-- 5. Verify index exists
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'subscriptions'
AND indexname = 'idx_subscriptions_phone';
-- Should return 1 row

-- 6. Test unique constraint (should fail)
-- DO NOT RUN IN PRODUCTION - This is just for testing
-- INSERT INTO subscriptions (phone_number, opted_in) 
-- VALUES ('+27123456789', true), ('+27123456789', true);
-- Should error: duplicate key value violates unique constraint

-- ============================================
-- ROLLBACK PROCEDURE (if needed)
-- ============================================

-- ONLY RUN IF YOU NEED TO ROLLBACK

-- Step 1: Drop unique constraint
-- ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_phone_unique;

-- Step 2: Restore deleted records from audit log
-- INSERT INTO subscriptions (id, phone_number, opted_in, created_at)
-- SELECT 
--     unnest(deleted_ids) as id,
--     phone_number,
--     true as opted_in,
--     NOW() as created_at
-- FROM subscriber_deduplication_log;

-- Step 3: Verify restoration
-- SELECT COUNT(*) FROM subscriptions;
-- Should match original count

-- Step 4: Drop audit log (optional)
-- DROP TABLE IF EXISTS subscriber_deduplication_log;

-- ============================================
-- CLEANUP (after successful migration)
-- ============================================

-- Remove backup table after confirming migration success
-- DROP TABLE IF EXISTS subscriptions_backup_20260124;

-- ============================================
-- MONITORING QUERIES
-- ============================================

-- Check for any new duplicate attempts (should be blocked by constraint)
SELECT 
    tablename,
    schemaname,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables
WHERE tablename = 'subscriptions';

-- Performance check - index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'subscriptions'
AND indexname = 'idx_subscriptions_phone';
