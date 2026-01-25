-- Phase 2 Day 1: POST-MIGRATION Verification
-- Run this AFTER the migration to verify success

-- ============================================
-- VERIFICATION: Check Migration Results
-- ============================================

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

-- 3. Check audit log summary
SELECT 
    COUNT(*) as total_deduplication_events,
    SUM(duplicate_count) as total_phone_numbers_deduplicated,
    SUM(array_length(deleted_ids, 1)) as total_records_deleted
FROM subscriber_deduplication_log;

-- 4. View audit log details
SELECT 
    phone_number,
    duplicate_count,
    array_length(deleted_ids, 1) as records_deleted,
    kept_id,
    deduplicated_at
FROM subscriber_deduplication_log
ORDER BY duplicate_count DESC, deduplicated_at DESC
LIMIT 20;

-- 5. Verify index exists
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'subscriptions'
AND indexname = 'idx_subscriptions_phone';
-- Should return 1 row

-- 6. Compare counts
SELECT 
    (SELECT COUNT(*) FROM subscriptions_backup_20260124) as before_count,
    (SELECT COUNT(*) FROM subscriptions) as after_count,
    (SELECT COUNT(*) FROM subscriptions_backup_20260124) - (SELECT COUNT(*) FROM subscriptions) as records_removed,
    (SELECT SUM(array_length(deleted_ids, 1)) FROM subscriber_deduplication_log) as audit_log_count;

-- 7. Test unique constraint (should fail with error)
DO $$
BEGIN
    -- Try to insert duplicate
    INSERT INTO subscriptions (phone_number, opted_in) 
    VALUES ('+27999999999', true);
    
    INSERT INTO subscriptions (phone_number, opted_in) 
    VALUES ('+27999999999', true);
    
    RAISE EXCEPTION 'Unique constraint test failed - duplicates were allowed!';
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'SUCCESS: Unique constraint is working correctly';
        -- Clean up test data
        DELETE FROM subscriptions WHERE phone_number = '+27999999999';
END $$;

-- ============================================
-- MONITORING QUERIES
-- ============================================

-- Check table statistics
SELECT 
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_rows,
    n_dead_tup as dead_rows
FROM pg_stat_user_tables
WHERE tablename = 'subscriptions';

-- Check index usage
SELECT 
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'subscriptions'
AND indexname = 'idx_subscriptions_phone';

-- ============================================
-- CLEANUP (after verification)
-- ============================================

-- Remove backup table after confirming success
-- DROP TABLE IF EXISTS subscriptions_backup_20260124;
