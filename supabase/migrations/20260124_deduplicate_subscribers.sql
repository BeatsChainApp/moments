-- Phase 2 Day 1: Subscriber Deduplication
-- Remove duplicate phone numbers and add unique constraint

-- Step 1: Identify duplicates (keep oldest record by created_at)
CREATE TEMP TABLE duplicate_subscribers AS
SELECT 
    phone_number,
    (ARRAY_AGG(id ORDER BY created_at ASC))[1] as keep_id,
    COUNT(*) as duplicate_count
FROM subscriptions
GROUP BY phone_number
HAVING COUNT(*) > 1;

-- Step 2: Log duplicates for audit
CREATE TABLE IF NOT EXISTS subscriber_deduplication_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    deleted_ids UUID[] NOT NULL,
    kept_id UUID NOT NULL,
    duplicate_count INTEGER NOT NULL,
    deduplicated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Insert audit log
INSERT INTO subscriber_deduplication_log (phone_number, deleted_ids, kept_id, duplicate_count)
SELECT 
    ds.phone_number,
    ARRAY_AGG(s.id) FILTER (WHERE s.id != ds.keep_id) as deleted_ids,
    ds.keep_id,
    ds.duplicate_count
FROM duplicate_subscribers ds
JOIN subscriptions s ON s.phone_number = ds.phone_number
GROUP BY ds.phone_number, ds.keep_id, ds.duplicate_count;

-- Step 4: Delete duplicates (keep oldest record)
DELETE FROM subscriptions
WHERE id IN (
    SELECT s.id
    FROM subscriptions s
    JOIN duplicate_subscribers ds ON s.phone_number = ds.phone_number
    WHERE s.id != ds.keep_id
);

-- Step 5: Add unique constraint
ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_phone_unique UNIQUE (phone_number);

-- Step 6: Create index for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_phone ON subscriptions(phone_number);

-- Verification query
SELECT 
    COUNT(*) as total_subscribers,
    COUNT(DISTINCT phone_number) as unique_phones,
    (SELECT COUNT(*) FROM subscriber_deduplication_log) as duplicates_removed
FROM subscriptions;
