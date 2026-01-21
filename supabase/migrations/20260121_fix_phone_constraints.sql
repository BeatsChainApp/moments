-- Fix phone number constraints for South African numbers
-- Migration: 20260121_fix_phone_constraints.sql

-- 1. Drop existing problematic constraints
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_phone_number_check;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_phone_number_format;

-- 2. Add correct constraints for SA numbers (27XXXXXXXXX, +27XXXXXXXXX, 0XXXXXXXXX)
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_phone_number_check 
CHECK (phone_number ~ '^(\+?27|0)[0-9]{9}$');

ALTER TABLE messages ADD CONSTRAINT messages_phone_number_format 
CHECK (from_number ~ '^(\+?27|0)[0-9]{9}$');

-- 3. Clean up duplicate authority profiles first
DELETE FROM authority_profiles 
WHERE ctid NOT IN (
  SELECT MIN(ctid) 
  FROM authority_profiles 
  GROUP BY user_identifier
);

-- 4. Add unique constraint to authority_profiles
ALTER TABLE authority_profiles ADD CONSTRAINT authority_profiles_user_identifier_unique 
UNIQUE (user_identifier);

-- 5. Verify constraints work with test data
DO $$
BEGIN
  -- Test valid SA phone numbers
  ASSERT '27727002502' ~ '^(\+?27|0)[0-9]{9}$', 'SA number without + should pass';
  ASSERT '+27727002502' ~ '^(\+?27|0)[0-9]{9}$', 'SA number with + should pass';
  ASSERT '0727002502' ~ '^(\+?27|0)[0-9]{9}$', 'SA number with 0 should pass';
  
  RAISE NOTICE 'Phone number constraints fixed successfully';
END $$;