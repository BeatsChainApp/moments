-- Fix phone numbers missing + prefix

UPDATE subscriptions 
SET phone_number = '+' || phone_number 
WHERE phone_number !~ '^\+' 
  AND phone_number ~ '^[0-9]+$';

-- Verify all phone numbers now have + prefix
SELECT phone_number FROM subscriptions WHERE phone_number !~ '^\+';
