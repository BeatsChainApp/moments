-- Fix stuck broadcasts and identify root cause
-- Run this in Supabase SQL Editor

-- 1. Check current broadcast status
SELECT 
  status,
  COUNT(*) as count,
  MIN(broadcast_started_at) as oldest,
  MAX(broadcast_started_at) as newest
FROM broadcasts
GROUP BY status
ORDER BY status;

-- 2. Check if subscribers exist
SELECT COUNT(*) as total_subscribers,
       COUNT(CASE WHEN opted_in THEN 1 END) as opted_in,
       COUNT(CASE WHEN phone_number LIKE '+%' THEN 1 END) as valid_format
FROM subscriptions;

-- 3. Check if get_active_subscribers function exists
SELECT EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'get_active_subscribers'
) as function_exists;

-- 4. Test get_active_subscribers function
SELECT COUNT(*) as subscriber_count 
FROM get_active_subscribers();

-- 5. Mark old stuck broadcasts as failed (older than 1 hour)
UPDATE broadcasts
SET status = 'failed',
    failure_count = recipient_count,
    broadcast_completed_at = NOW()
WHERE status IN ('pending', 'processing')
  AND broadcast_started_at < NOW() - INTERVAL '1 hour'
RETURNING id, moment_id, status, recipient_count;

-- 6. Check recent moments that should have been broadcast
SELECT 
  m.id,
  m.title,
  m.status,
  m.publish_to_whatsapp,
  m.broadcasted_at,
  b.id as broadcast_id,
  b.status as broadcast_status,
  b.recipient_count
FROM moments m
LEFT JOIN broadcasts b ON b.moment_id = m.id
WHERE m.created_at > NOW() - INTERVAL '24 hours'
ORDER BY m.created_at DESC
LIMIT 10;

-- 7. Check moment_intents status
SELECT 
  channel,
  status,
  COUNT(*) as count,
  MAX(created_at) as last_created
FROM moment_intents
GROUP BY channel, status
ORDER BY channel, status;
