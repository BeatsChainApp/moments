-- Helper function to log notifications
CREATE OR REPLACE FUNCTION log_notification(
  p_phone_number TEXT,
  p_notification_type TEXT,
  p_channel TEXT DEFAULT 'whatsapp',
  p_delivered BOOLEAN DEFAULT true,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO notification_log (
    phone_number,
    notification_type,
    channel,
    delivered,
    metadata,
    created_at
  ) VALUES (
    p_phone_number,
    p_notification_type,
    p_channel,
    p_delivered,
    p_metadata,
    NOW()
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;
