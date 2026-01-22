-- Phase 5: Emergency Alerts & Multi-Channel Support
-- Emergency notification system with priority bypass and multi-channel delivery

-- 1. Add emergency alert configuration table
CREATE TABLE IF NOT EXISTS emergency_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) NOT NULL, -- 'emergency', 'safety', 'maintenance'
  severity VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low'
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  target_regions TEXT[], -- NULL = all regions
  target_categories TEXT[], -- NULL = all categories
  bypass_preferences BOOLEAN DEFAULT true, -- Emergency alerts bypass user preferences
  multi_channel BOOLEAN DEFAULT false, -- Send via multiple channels if available
  channels TEXT[] DEFAULT ARRAY['whatsapp'], -- 'whatsapp', 'sms', 'email'
  expires_at TIMESTAMPTZ, -- Alert expiration
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'sending', 'sent', 'cancelled'
  recipient_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Add multi-channel configuration to subscriptions
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS sms_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS email_address VARCHAR(255),
ADD COLUMN IF NOT EXISTS emergency_contact_method VARCHAR(20) DEFAULT 'whatsapp', -- 'whatsapp', 'sms', 'email', 'all'
ADD COLUMN IF NOT EXISTS emergency_alerts_enabled BOOLEAN DEFAULT true;

-- 3. Add channel tracking to notification_log
ALTER TABLE notification_log
ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'whatsapp', -- 'whatsapp', 'sms', 'email'
ADD COLUMN IF NOT EXISTS emergency_alert_id UUID REFERENCES emergency_alerts(id),
ADD COLUMN IF NOT EXISTS bypass_preferences BOOLEAN DEFAULT false;

-- 4. Create function to send emergency alert
CREATE OR REPLACE FUNCTION send_emergency_alert(
  p_alert_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_alert emergency_alerts;
  v_subscribers RECORD;
  v_notification_type_id UUID;
  v_sent_count INTEGER := 0;
  v_failed_count INTEGER := 0;
BEGIN
  -- Get alert details
  SELECT * INTO v_alert FROM emergency_alerts WHERE id = p_alert_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Alert not found');
  END IF;
  
  -- Get notification type ID for emergency alerts
  SELECT id INTO v_notification_type_id 
  FROM notification_types 
  WHERE type_code = v_alert.alert_type 
  LIMIT 1;
  
  -- Update alert status
  UPDATE emergency_alerts 
  SET status = 'sending', sent_at = NOW() 
  WHERE id = p_alert_id;
  
  -- Get target subscribers
  FOR v_subscribers IN
    SELECT 
      phone_number,
      sms_number,
      email_address,
      emergency_contact_method,
      regions
    FROM subscriptions
    WHERE opted_in = true
      AND emergency_alerts_enabled = true
      AND (v_alert.target_regions IS NULL OR regions && v_alert.target_regions)
  LOOP
    -- Call orchestrator for each subscriber
    BEGIN
      PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/notification-orchestrator',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_key')
        ),
        body := jsonb_build_object(
          'notification_type', v_alert.alert_type,
          'recipient_phone', v_subscribers.phone_number,
          'message_content', v_alert.title || E'\n\n' || v_alert.message,
          'priority', 5, -- Emergency priority
          'bypass_preferences', v_alert.bypass_preferences,
          'channel', CASE 
            WHEN v_alert.multi_channel THEN v_subscribers.emergency_contact_method
            ELSE 'whatsapp'
          END,
          'metadata', jsonb_build_object(
            'emergency_alert_id', p_alert_id,
            'severity', v_alert.severity,
            'alert_type', v_alert.alert_type
          )
        )
      );
      
      v_sent_count := v_sent_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_failed_count := v_failed_count + 1;
    END;
  END LOOP;
  
  -- Update alert with results
  UPDATE emergency_alerts 
  SET 
    status = 'sent',
    recipient_count = v_sent_count + v_failed_count,
    success_count = v_sent_count,
    failure_count = v_failed_count
  WHERE id = p_alert_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'alert_id', p_alert_id,
    'recipients', v_sent_count + v_failed_count,
    'sent', v_sent_count,
    'failed', v_failed_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to cancel emergency alert
CREATE OR REPLACE FUNCTION cancel_emergency_alert(
  p_alert_id UUID
) RETURNS JSONB AS $$
BEGIN
  UPDATE emergency_alerts 
  SET status = 'cancelled' 
  WHERE id = p_alert_id AND status = 'draft';
  
  IF FOUND THEN
    RETURN jsonb_build_object('success', true, 'message', 'Alert cancelled');
  ELSE
    RETURN jsonb_build_object('error', 'Alert not found or already sent');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to get active emergency alerts
CREATE OR REPLACE FUNCTION get_active_emergency_alerts()
RETURNS TABLE (
  id UUID,
  alert_type VARCHAR,
  severity VARCHAR,
  title VARCHAR,
  message TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ea.id,
    ea.alert_type,
    ea.severity,
    ea.title,
    ea.message,
    ea.created_at,
    ea.expires_at
  FROM emergency_alerts ea
  WHERE ea.status = 'sent'
    AND (ea.expires_at IS NULL OR ea.expires_at > NOW())
  ORDER BY ea.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_status ON emergency_alerts(status);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_created_at ON emergency_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_emergency ON notification_log(emergency_alert_id) WHERE emergency_alert_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notification_log_channel ON notification_log(channel);

-- 8. Add RLS policies for emergency_alerts
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage emergency alerts"
ON emergency_alerts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 9. Grant permissions
GRANT SELECT, INSERT, UPDATE ON emergency_alerts TO authenticated;
GRANT EXECUTE ON FUNCTION send_emergency_alert TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_emergency_alert TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_emergency_alerts TO authenticated;

-- 10. Add emergency alert types if not exist
INSERT INTO notification_types (type_code, display_name, category, priority_level, user_controllable, default_enabled, description)
VALUES 
  ('emergency_alert', 'Emergency Alert', 'emergency', 5, false, true, 'Critical emergency notifications that bypass all preferences'),
  ('safety_alert', 'Safety Alert', 'emergency', 4, true, true, 'Important safety information for community members'),
  ('system_maintenance', 'System Maintenance', 'emergency', 3, true, true, 'Scheduled system maintenance notifications')
ON CONFLICT (type_code) DO NOTHING;

-- Verification queries
COMMENT ON TABLE emergency_alerts IS 'Phase 5: Emergency alert system with multi-channel support';
COMMENT ON FUNCTION send_emergency_alert IS 'Send emergency alert to all eligible subscribers with priority bypass';
COMMENT ON FUNCTION cancel_emergency_alert IS 'Cancel a draft emergency alert before sending';
COMMENT ON FUNCTION get_active_emergency_alerts IS 'Get all active emergency alerts that have not expired';
