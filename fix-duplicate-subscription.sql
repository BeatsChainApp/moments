-- Fix duplicate subscription issue for 27727002502 (using only existing columns)
-- Problem: +27727002502 (opted_in: false) conflicts with 27727002502

-- 1. Check current duplicates
SELECT 
  phone_number,
  opted_in,
  regions,
  categories,
  last_activity,
  opted_in_at
FROM subscriptions 
WHERE phone_number IN ('27727002502', '+27727002502', '0727002502')
ORDER BY last_activity DESC;

-- 2. Delete the duplicate with + prefix (the opted-out one)
DELETE FROM subscriptions 
WHERE phone_number = '+27727002502';

-- 3. Ensure the correct subscription exists and is active (using only existing columns)
INSERT INTO subscriptions (
  phone_number,
  opted_in,
  regions,
  categories,
  opted_in_at,
  last_activity
) VALUES (
  '27727002502',
  true,
  ARRAY['National'],
  ARRAY['Education', 'Safety', 'Opportunity', 'Community'],
  NOW(),
  NOW()
) ON CONFLICT (phone_number) DO UPDATE SET
  opted_in = true,
  last_activity = NOW(),
  opted_out_at = NULL;

-- 4. Verify the fix
SELECT 
  phone_number,
  opted_in,
  regions,
  categories,
  last_activity
FROM subscriptions 
WHERE phone_number LIKE '%27727002502%';