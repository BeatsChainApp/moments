-- COMPREHENSIVE DATABASE FIX FOR BROADCAST SYSTEM
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: FIX PHONE NUMBERS
-- ============================================================================
DO $$
DECLARE
  fixed_count INTEGER;
BEGIN
  UPDATE subscriptions 
  SET phone_number = '+' || phone_number 
  WHERE phone_number !~ '^\+' 
    AND phone_number ~ '^[0-9]+$';
  
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  RAISE NOTICE 'Fixed % phone numbers', fixed_count;
END $$;

-- ============================================================================
-- STEP 2: ENSURE RPC FUNCTION EXISTS
-- ============================================================================
CREATE OR REPLACE FUNCTION get_active_subscribers()
RETURNS TABLE (phone_number TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT s.phone_number
  FROM subscriptions s
  WHERE s.opted_in = true
    AND s.phone_number IS NOT NULL
    AND s.phone_number LIKE '+%';
END;
$$;

GRANT EXECUTE ON FUNCTION get_active_subscribers() TO service_role;
GRANT EXECUTE ON FUNCTION get_active_subscribers() TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_subscribers() TO anon;

-- ============================================================================
-- STEP 3: CLEAN STUCK BROADCASTS
-- ============================================================================
UPDATE broadcasts
SET status = 'failed',
    failure_count = recipient_count,
    broadcast_completed_at = NOW()
WHERE status IN ('pending', 'processing')
  AND (broadcast_started_at < NOW() - INTERVAL '10 minutes' OR broadcast_started_at IS NULL);

-- ============================================================================
-- STEP 4: VERIFY SYSTEM STATE
-- ============================================================================
SELECT 
  '=== SYSTEM HEALTH CHECK ===' as section,
  NULL::text as metric,
  NULL::bigint as value;

SELECT 
  'Subscribers' as section,
  'Total' as metric,
  COUNT(*) as value
FROM subscriptions
UNION ALL
SELECT 
  'Subscribers',
  'Opted In',
  COUNT(*)
FROM subscriptions WHERE opted_in = true
UNION ALL
SELECT 
  'Subscribers',
  'Valid Format (+)',
  COUNT(*)
FROM subscriptions WHERE phone_number LIKE '+%'
UNION ALL
SELECT 
  'RPC Function',
  'Active Subscribers',
  COUNT(*)
FROM get_active_subscribers()
UNION ALL
SELECT 
  'Broadcasts',
  'Completed',
  COUNT(*)
FROM broadcasts WHERE status = 'completed'
UNION ALL
SELECT 
  'Broadcasts',
  'Failed',
  COUNT(*)
FROM broadcasts WHERE status = 'failed'
UNION ALL
SELECT 
  'Broadcasts',
  'Stuck (pending/processing)',
  COUNT(*)
FROM broadcasts WHERE status IN ('pending', 'processing')
ORDER BY section, metric;

-- ============================================================================
-- STEP 5: SHOW SAMPLE DATA
-- ============================================================================
SELECT '=== SAMPLE SUBSCRIBERS ===' as info;
SELECT phone_number, opted_in, created_at 
FROM subscriptions 
ORDER BY created_at DESC 
LIMIT 5;

SELECT '=== RECENT BROADCASTS ===' as info;
SELECT 
  id,
  moment_id,
  status,
  recipient_count,
  success_count,
  failure_count,
  broadcast_started_at
FROM broadcasts
ORDER BY broadcast_started_at DESC NULLS LAST
LIMIT 5;

-- ============================================================================
-- STEP 6: TEST RPC FUNCTION
-- ============================================================================
SELECT '=== RPC FUNCTION TEST ===' as info;
SELECT * FROM get_active_subscribers() LIMIT 5;
