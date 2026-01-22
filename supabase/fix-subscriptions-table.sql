-- Check and fix subscriptions table structure
-- Run this in Supabase SQL Editor if broadcast fails with "column does not exist" error

-- Check current table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subscriptions'
ORDER BY ordinal_position;

-- If phone_number column is missing, add it:
-- ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS phone_number TEXT;
-- ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_phone_number_check CHECK (phone_number ~ '^\+[1-9]\d{1,14}$');

-- If table doesn't exist at all, create it:
/*
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT UNIQUE NOT NULL CHECK (phone_number ~ '^\+[1-9]\d{1,14}$'),
  opted_in BOOLEAN DEFAULT true,
  regions TEXT[] DEFAULT ARRAY['National'],
  categories TEXT[] DEFAULT ARRAY['Education','Safety','Opportunity'],
  language_preference TEXT DEFAULT 'eng',
  opted_in_at TIMESTAMPTZ DEFAULT NOW(),
  opted_out_at TIMESTAMPTZ,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
*/

-- Add some test subscribers for testing
INSERT INTO subscriptions (phone_number, opted_in) 
VALUES 
  ('+27658295041', true),  -- Test number 1
  ('+27123456789', true)   -- Test number 2
ON CONFLICT (phone_number) DO NOTHING;

-- Verify
SELECT COUNT(*) as total_subscribers, 
       COUNT(*) FILTER (WHERE opted_in = true) as opted_in_count
FROM subscriptions;
