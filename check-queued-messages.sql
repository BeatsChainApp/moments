-- Check for queued/pending WhatsApp messages
-- Your message from 27727002502 may be stuck due to constraint failures

-- 1. Check messages table for failed inserts or pending status
SELECT 
  id,
  from_number,
  content,
  message_type,
  processed,
  moderation_status,
  created_at
FROM messages 
WHERE from_number = '27727002502' 
   OR from_number = '+27727002502'
ORDER BY created_at DESC 
LIMIT 10;

-- 2. Check for any messages with pending status
SELECT 
  id,
  from_number,
  content,
  processed,
  moderation_status,
  created_at
FROM messages 
WHERE processed = false 
   OR moderation_status = 'pending'
ORDER BY created_at DESC 
LIMIT 20;

-- 3. Check moments created from your number
SELECT 
  id,
  title,
  content,
  status,
  created_by,
  content_source,
  created_at
FROM moments 
WHERE created_by LIKE '%27727002502%'
   OR content LIKE '%Duck Po%'
   OR title LIKE '%Community Cleanup%'
ORDER BY created_at DESC;

-- 4. Check authority profiles for your number
SELECT 
  id,
  user_identifier,
  authority_level,
  role_label,
  status,
  created_at
FROM authority_profiles 
WHERE user_identifier IN ('27727002502', '+27727002502', '0727002502');

-- 5. Check subscription status
SELECT 
  phone_number,
  opted_in,
  regions,
  categories,
  last_activity,
  opted_in_at
FROM subscriptions 
WHERE phone_number IN ('27727002502', '+27727002502', '0727002502');