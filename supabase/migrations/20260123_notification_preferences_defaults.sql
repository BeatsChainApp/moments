-- Add default notification preferences for existing subscribers
INSERT INTO notification_preferences (phone_number, authority_granted, authority_expiring, authority_suspended, created_at)
SELECT 
  phone_number,
  true, -- authority_granted
  true, -- authority_expiring  
  true, -- authority_suspended
  NOW()
FROM subscriptions
WHERE opted_in = true
ON CONFLICT (phone_number) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_phone ON notification_preferences(phone_number);
