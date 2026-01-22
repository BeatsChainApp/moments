-- Phase 4: Verification & Testing
-- Run these queries to verify Phase 4 deployment

-- 1. Check triggers are created
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE 'trigger_%'
  AND trigger_name IN (
    'trigger_authority_verified',
    'trigger_authority_suspended', 
    'trigger_broadcast_completed',
    'trigger_quota_check'
  )
ORDER BY trigger_name;

-- 2. Check functions are created
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name IN (
  'notify_authority_verified',
  'notify_authority_suspended',
  'notify_broadcast_completed',
  'check_quota_warning',
  'notify_moment_approved',
  'notify_moment_rejected'
)
ORDER BY routine_name;

-- 3. Check transactional notification types exist
SELECT 
  type_code,
  display_name,
  priority_level
FROM notification_types
WHERE category = 'transactional'
ORDER BY type_code;

-- 4. Test: Call moment approved function (safe test - won't send if moment doesn't exist)
-- SELECT notify_moment_approved('00000000-0000-0000-0000-000000000000');

-- 5. Check notification_log for any transactional notifications
SELECT 
  nt.type_code,
  nl.recipient_phone,
  nl.status,
  nl.created_at
FROM notification_log nl
JOIN notification_types nt ON nt.id = nl.notification_type_id
WHERE nt.category = 'transactional'
ORDER BY nl.created_at DESC
LIMIT 5;

-- Expected Results:
-- Query 1: Should show 4 triggers
-- Query 2: Should show 6 functions
-- Query 3: Should show 6 transactional types
-- Query 5: May be empty if no events triggered yet
