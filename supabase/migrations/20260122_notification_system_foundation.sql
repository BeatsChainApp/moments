-- Phase 1: Notification System Foundation
-- Date: January 22, 2026
-- Purpose: Create core notification infrastructure without breaking existing systems

-- 1. Create notification_types table
CREATE TABLE IF NOT EXISTS notification_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_code text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('broadcast', 'individual', 'system', 'transactional', 'emergency')),
  default_enabled boolean DEFAULT true,
  user_controllable boolean DEFAULT true,
  priority_level int DEFAULT 2 CHECK (priority_level BETWEEN 1 AND 5),
  template_name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notification_types_category ON notification_types(category);
CREATE INDEX idx_notification_types_priority ON notification_types(priority_level);

-- 2. Create notification_log table
CREATE TABLE IF NOT EXISTS notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type_id uuid REFERENCES notification_types(id),
  recipient_phone text NOT NULL,
  channel text DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'sms', 'email')),
  priority int DEFAULT 2 CHECK (priority BETWEEN 1 AND 5),
  status text DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
  template_used text,
  message_content text,
  metadata jsonb DEFAULT '{}'::jsonb,
  scheduled_for timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  retry_count int DEFAULT 0,
  broadcast_id uuid REFERENCES broadcasts(id),
  moment_id uuid REFERENCES moments(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notification_log_recipient ON notification_log(recipient_phone);
CREATE INDEX idx_notification_log_status ON notification_log(status);
CREATE INDEX idx_notification_log_created ON notification_log(created_at DESC);
CREATE INDEX idx_notification_log_type ON notification_log(notification_type_id);
CREATE INDEX idx_notification_log_broadcast ON notification_log(broadcast_id) WHERE broadcast_id IS NOT NULL;

-- 3. Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  notification_type_id uuid REFERENCES notification_types(id),
  enabled boolean DEFAULT true,
  frequency text DEFAULT 'realtime' CHECK (frequency IN ('realtime', 'hourly', 'daily', 'weekly')),
  quiet_hours_start time,
  quiet_hours_end time,
  max_per_day int,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(phone_number, notification_type_id)
);

CREATE INDEX idx_notification_prefs_phone ON notification_preferences(phone_number);
CREATE INDEX idx_notification_prefs_type ON notification_preferences(notification_type_id);

-- 4. Create notification_batches table
CREATE TABLE IF NOT EXISTS notification_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_type text NOT NULL CHECK (batch_type IN ('digest', 'scheduled', 'bulk')),
  notification_type_id uuid REFERENCES notification_types(id),
  recipient_count int DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  success_count int DEFAULT 0,
  failure_count int DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notification_batches_status ON notification_batches(status);
CREATE INDEX idx_notification_batches_scheduled ON notification_batches(scheduled_for);

-- 5. Create notification_templates_mapping table
CREATE TABLE IF NOT EXISTS notification_templates_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type_id uuid REFERENCES notification_types(id),
  template_name text NOT NULL,
  template_version text DEFAULT 'v1',
  authority_level_min int DEFAULT 0,
  authority_level_max int DEFAULT 5,
  is_default boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_notification_templates_type ON notification_templates_mapping(notification_type_id);
CREATE INDEX idx_notification_templates_active ON notification_templates_mapping(active) WHERE active = true;

-- 6. Enhance existing broadcasts table
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS notification_type_id uuid REFERENCES notification_types(id);
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS priority_level int DEFAULT 2 CHECK (priority_level BETWEEN 1 AND 5);

-- 7. Enhance existing subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS notification_preferences_updated_at timestamptz;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS digest_enabled boolean DEFAULT false;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS digest_frequency text DEFAULT 'daily' CHECK (digest_frequency IN ('daily', 'weekly'));

-- 8. Seed notification types (24 types)
INSERT INTO notification_types (type_code, display_name, description, category, default_enabled, user_controllable, priority_level, template_name) VALUES
-- Broadcast Notifications
('moment_broadcast_verified', 'Verified Moment Broadcast', 'Broadcast from verified authority', 'broadcast', true, true, 2, 'verified_moment_comprehensive_v1'),
('moment_broadcast_sponsored', 'Sponsored Moment Broadcast', 'Broadcast with sponsor partnership', 'broadcast', true, true, 2, 'verified_sponsored_comprehensive_v1'),
('moment_broadcast_community', 'Community Moment Broadcast', 'Broadcast from community member', 'broadcast', true, true, 2, 'community_moment_comprehensive_v1'),
('moment_broadcast_official', 'Official Announcement Broadcast', 'Broadcast from high authority', 'broadcast', true, true, 3, 'official_announcement_comprehensive_v1'),

-- Individual Notifications
('comment_approved', 'Comment Approved', 'Your comment was approved', 'individual', true, true, 2, null),
('comment_reply', 'Comment Reply', 'Someone replied to your comment', 'individual', true, true, 2, null),
('comment_mentioned', 'Mentioned in Comment', 'You were mentioned in a comment', 'individual', true, true, 2, null),
('moment_approved', 'Moment Approved', 'Your moment was approved', 'individual', true, false, 3, null),
('moment_rejected', 'Moment Rejected', 'Your moment was rejected', 'individual', true, false, 2, null),

-- System Notifications
('welcome_subscription', 'Welcome Message', 'New subscriber welcome', 'system', true, false, 2, 'welcome_subscription_comprehensive_v2'),
('subscription_confirmed', 'Subscription Confirmed', 'Subscription change confirmed', 'system', true, false, 2, null),
('unsubscribe_confirmed', 'Unsubscribe Confirmed', 'Unsubscribe confirmation', 'system', true, false, 2, 'unsubscribe_confirm_comprehensive_v2'),
('preferences_updated', 'Preferences Updated', 'Notification preferences changed', 'system', true, true, 1, null),
('digest_daily', 'Daily Digest', 'Daily summary of moments', 'system', false, true, 1, null),
('digest_weekly', 'Weekly Digest', 'Weekly summary of moments', 'system', false, true, 1, null),

-- Transactional Notifications
('authority_verified', 'Authority Verified', 'Authority status granted', 'transactional', true, false, 3, null),
('authority_suspended', 'Authority Suspended', 'Authority status suspended', 'transactional', true, false, 4, null),
('broadcast_scheduled', 'Broadcast Scheduled', 'Broadcast scheduled confirmation', 'transactional', true, true, 2, null),
('broadcast_completed', 'Broadcast Completed', 'Broadcast completion summary', 'transactional', true, true, 2, null),
('quota_warning', 'Quota Warning', 'Approaching broadcast quota limit', 'transactional', true, false, 3, null),
('quota_exceeded', 'Quota Exceeded', 'Broadcast quota exceeded', 'transactional', true, false, 4, null),

-- Emergency Notifications
('emergency_alert', 'Emergency Alert', 'Critical community alert', 'emergency', true, false, 5, null),
('safety_alert', 'Safety Alert', 'Safety-related urgent information', 'emergency', true, false, 5, null),
('system_maintenance', 'System Maintenance', 'Planned system downtime', 'emergency', true, false, 4, null)
ON CONFLICT (type_code) DO NOTHING;

-- 9. Create helper function to get user preferences
CREATE OR REPLACE FUNCTION get_notification_preference(
  p_phone_number text,
  p_notification_type_id uuid
)
RETURNS TABLE (
  enabled boolean,
  frequency text,
  quiet_hours_start time,
  quiet_hours_end time,
  max_per_day int
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(np.enabled, nt.default_enabled) as enabled,
    COALESCE(np.frequency, 'realtime') as frequency,
    np.quiet_hours_start,
    np.quiet_hours_end,
    np.max_per_day
  FROM notification_types nt
  LEFT JOIN notification_preferences np ON np.notification_type_id = nt.id AND np.phone_number = p_phone_number
  WHERE nt.id = p_notification_type_id;
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to check if notification should be sent
CREATE OR REPLACE FUNCTION should_send_notification(
  p_phone_number text,
  p_notification_type_id uuid,
  p_priority int DEFAULT 2
)
RETURNS boolean AS $$
DECLARE
  v_enabled boolean;
  v_quiet_start time;
  v_quiet_end time;
  v_max_per_day int;
  v_today_count int;
  v_current_time time;
BEGIN
  -- Get user preferences
  SELECT enabled, quiet_hours_start, quiet_hours_end, max_per_day
  INTO v_enabled, v_quiet_start, v_quiet_end, v_max_per_day
  FROM get_notification_preference(p_phone_number, p_notification_type_id);
  
  -- Check if disabled
  IF NOT v_enabled THEN
    RETURN false;
  END IF;
  
  -- Emergency notifications (priority 4-5) bypass all checks
  IF p_priority >= 4 THEN
    RETURN true;
  END IF;
  
  -- Check quiet hours
  IF v_quiet_start IS NOT NULL AND v_quiet_end IS NOT NULL THEN
    v_current_time := CURRENT_TIME;
    IF v_quiet_start < v_quiet_end THEN
      -- Normal range (e.g., 22:00 - 08:00)
      IF v_current_time >= v_quiet_start AND v_current_time < v_quiet_end THEN
        RETURN false;
      END IF;
    ELSE
      -- Overnight range (e.g., 22:00 - 08:00 next day)
      IF v_current_time >= v_quiet_start OR v_current_time < v_quiet_end THEN
        RETURN false;
      END IF;
    END IF;
  END IF;
  
  -- Check daily limit
  IF v_max_per_day IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_today_count
    FROM notification_log
    WHERE recipient_phone = p_phone_number
      AND notification_type_id = p_notification_type_id
      AND created_at >= CURRENT_DATE
      AND status IN ('sent', 'delivered');
    
    IF v_today_count >= v_max_per_day THEN
      RETURN false;
    END IF;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger to update notification_preferences updated_at
CREATE OR REPLACE FUNCTION update_notification_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notification_preferences_timestamp
BEFORE UPDATE ON notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_notification_preferences_timestamp();

-- 12. Grant permissions (adjust role as needed)
GRANT SELECT, INSERT, UPDATE ON notification_types TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notification_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notification_batches TO authenticated;
GRANT SELECT ON notification_templates_mapping TO authenticated;

COMMENT ON TABLE notification_types IS 'Phase 1: Defines all 24 notification types across 4 categories';
COMMENT ON TABLE notification_log IS 'Phase 1: Comprehensive tracking of all notifications sent';
COMMENT ON TABLE notification_preferences IS 'Phase 2: User-specific notification preferences and controls';
COMMENT ON TABLE notification_batches IS 'Phase 3: Batch processing for digest and bulk notifications';
COMMENT ON TABLE notification_templates_mapping IS 'Phase 1: Maps notification types to WhatsApp templates';
