-- Check actual table structures before making assumptions

-- 1. Check subscriptions table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
ORDER BY ordinal_position;

-- 2. Check messages table structure  
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;

-- 3. Check authority_profiles table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'authority_profiles' 
ORDER BY ordinal_position;

-- 4. Check current duplicate subscriptions
SELECT 
  phone_number,
  opted_in,
  regions,
  categories,
  last_activity,
  opted_in_at
FROM subscriptions 
WHERE phone_number LIKE '%27727002502%'
ORDER BY last_activity DESC;