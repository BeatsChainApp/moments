-- Add default notification preferences for existing subscribers
DO $$
DECLARE
  granted_id uuid;
  expiring_id uuid;
  suspended_id uuid;
BEGIN
  SELECT id INTO granted_id FROM notification_types WHERE type_code = 'authority_granted';
  SELECT id INTO expiring_id FROM notification_types WHERE type_code = 'authority_expiring';
  SELECT id INTO suspended_id FROM notification_types WHERE type_code = 'authority_suspended';
  
  INSERT INTO notification_preferences (phone_number, notification_type_id, enabled, created_at)
  SELECT 
    s.phone_number,
    nt.id,
    true,
    NOW()
  FROM subscriptions s
  CROSS JOIN notification_types nt
  WHERE s.opted_in = true
    AND nt.type_code IN ('authority_granted', 'authority_expiring', 'authority_suspended')
  ON CONFLICT (phone_number, notification_type_id) DO NOTHING;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_phone ON notification_preferences(phone_number);
