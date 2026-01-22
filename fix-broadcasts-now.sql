-- Quick fix: Update stuck broadcasts and document the issue
-- Run in Supabase SQL Editor

-- 1. Mark all stuck broadcasts as failed (they need to be retried with correct payload)
UPDATE broadcasts
SET status = 'failed',
    failure_count = recipient_count,
    broadcast_completed_at = NOW()
WHERE status IN ('pending', 'processing')
RETURNING id, moment_id, recipient_count;

-- 2. Check if we have valid subscribers
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN phone_number LIKE '+%' THEN 1 END) as with_plus_prefix,
  COUNT(CASE WHEN opted_in THEN 1 END) as opted_in,
  STRING_AGG(DISTINCT phone_number, ', ') FILTER (WHERE phone_number !~ '^\+') as invalid_format
FROM subscriptions
LIMIT 5;

-- 3. Fix phone numbers if needed
UPDATE subscriptions 
SET phone_number = '+' || phone_number 
WHERE phone_number !~ '^\+' 
  AND phone_number ~ '^[0-9]+$';

-- 4. Verify get_active_subscribers function returns correct format
SELECT phone_number FROM get_active_subscribers() LIMIT 5;
