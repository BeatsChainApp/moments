-- Phase 2 Day 1: PRE-MIGRATION Investigation
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
