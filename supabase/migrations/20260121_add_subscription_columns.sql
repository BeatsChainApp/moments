-- Add missing essential columns to subscriptions table
-- Migration: 20260121_add_subscription_columns.sql

-- Add language support
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS language VARCHAR(3) DEFAULT 'eng';

-- Add consent tracking (POPIA compliance)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS consent_method VARCHAR(50) DEFAULT 'whatsapp_optin';

-- Add double opt-in confirmation
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS double_opt_in_confirmed BOOLEAN DEFAULT true;

-- Add opted_out_at for audit trail
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS opted_out_at TIMESTAMPTZ;

-- Add delivery preferences
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS delivery_schedule VARCHAR(20) DEFAULT 'instant';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS paused_until TIMESTAMPTZ;

-- Update existing records with defaults
UPDATE subscriptions 
SET 
  language = 'eng',
  consent_timestamp = COALESCE(opted_in_at, NOW()),
  consent_method = 'whatsapp_optin',
  double_opt_in_confirmed = true
WHERE language IS NULL;

-- Verify the additions
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
ORDER BY ordinal_position;