-- Add notification types for subscriber and moment events
INSERT INTO notification_types (type_code, display_name, description, default_enabled, default_priority)
VALUES 
  ('admin_new_subscriber', 'New Subscriber', 'Notification when a new user subscribes', true, 1),
  ('admin_moment_received', 'Moment Received', 'Notification when a new moment is submitted', true, 2)
ON CONFLICT (type_code) DO NOTHING;

-- Trigger: Notify admin when new subscriber joins
CREATE OR REPLACE FUNCTION notify_new_subscriber()
RETURNS TRIGGER AS $$
DECLARE
  type_id uuid;
  admin_emails text[];
BEGIN
  -- Only notify on new opt-ins (not updates)
  IF (TG_OP = 'INSERT' AND NEW.opted_in = true) OR 
     (TG_OP = 'UPDATE' AND OLD.opted_in = false AND NEW.opted_in = true) THEN
    
    SELECT id INTO type_id FROM notification_types WHERE type_code = 'admin_new_subscriber';
    SELECT array_agg(email) INTO admin_emails FROM admin_users WHERE active = true AND email IS NOT NULL;
    
    IF array_length(admin_emails, 1) > 0 THEN
      INSERT INTO notification_log (
        notification_type_id, recipient_phone, channel, priority,
        message_content, metadata, status
      )
      SELECT 
        type_id,
        unnest(admin_emails),
        'email',
        1,
        '📱 New Subscriber: ' || NEW.phone_number || E'\\n\\nRegions: ' || COALESCE(array_to_string(NEW.regions, ', '), 'None') || E'\\nInterests: ' || COALESCE(array_to_string(NEW.categories, ', '), 'None') || E'\\nLanguage: ' || COALESCE(NEW.language, 'eng'),
        jsonb_build_object('phone_number', NEW.phone_number, 'regions', NEW.regions, 'categories', NEW.categories),
        'queued';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_new_subscriber ON subscriptions;
CREATE TRIGGER trigger_notify_new_subscriber
  AFTER INSERT OR UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_subscriber();

-- Trigger: Notify admin when new moment is received (exclude broadcasts you initiate)
CREATE OR REPLACE FUNCTION notify_moment_received()
RETURNS TRIGGER AS $$
DECLARE
  type_id uuid;
  admin_emails text[];
  content_preview text;
BEGIN
  -- Only notify for WhatsApp-sourced moments in draft status
  IF NEW.content_source = 'whatsapp' AND NEW.status = 'draft' THEN
    
    SELECT id INTO type_id FROM notification_types WHERE type_code = 'admin_moment_received';
    SELECT array_agg(email) INTO admin_emails FROM admin_users WHERE active = true AND email IS NOT NULL;
    
    -- Create content preview (first 200 chars)
    content_preview := CASE 
      WHEN length(NEW.content) > 200 THEN substring(NEW.content from 1 for 200) || '...'
      ELSE NEW.content
    END;
    
    IF array_length(admin_emails, 1) > 0 THEN
      INSERT INTO notification_log (
        notification_type_id, recipient_phone, channel, priority,
        message_content, metadata, status
      )
      SELECT 
        type_id,
        unnest(admin_emails),
        'email',
        2,
        '📝 New Moment Received' || E'\\n\\nTitle: ' || NEW.title || E'\\n\\nContent:\\n' || content_preview || E'\\n\\nRegion: ' || NEW.region || E'\\nCategory: ' || NEW.category || E'\\nSource: WhatsApp',
        jsonb_build_object('moment_id', NEW.id, 'title', NEW.title, 'region', NEW.region, 'category', NEW.category),
        'queued';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_moment_received ON moments;
CREATE TRIGGER trigger_notify_moment_received
  AFTER INSERT ON moments
  FOR EACH ROW
  EXECUTE FUNCTION notify_moment_received();

-- Update broadcast notification trigger to exclude admin-initiated broadcasts
CREATE OR REPLACE FUNCTION notify_broadcast_completed()
RETURNS TRIGGER AS $$
DECLARE
  type_id uuid;
  admin_emails text[];
  moment_title text;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    SELECT id INTO type_id FROM notification_types WHERE type_code = 'admin_broadcast_completed';
    SELECT array_agg(email) INTO admin_emails FROM admin_users WHERE active = true AND email IS NOT NULL;
    SELECT title INTO moment_title FROM moments WHERE id = NEW.moment_id;
    
    -- SKIP notification if broadcast was manually initiated (you're aware of it)
    -- Only notify for automated/scheduled broadcasts
    IF NEW.broadcast_type = 'scheduled' OR NEW.broadcast_type = 'automated' THEN
      IF array_length(admin_emails, 1) > 0 THEN
        INSERT INTO notification_log (
          notification_type_id, recipient_phone, channel, priority,
          message_content, metadata, status, broadcast_id
        )
        SELECT 
          type_id,
          unnest(admin_emails),
          'email',
          2,
          '✅ Scheduled Broadcast Completed' || E'\\n\\nMoment: ' || moment_title || E'\\n\\nDelivered: ' || NEW.success_count || '/' || NEW.recipient_count || ' (' || ROUND((NEW.success_count::decimal / NULLIF(NEW.recipient_count, 0) * 100), 1) || '%)',
          jsonb_build_object('moment_id', NEW.moment_id, 'title', moment_title),
          'queued',
          NEW.id
        FROM (SELECT 1) AS dummy
        WHERE type_id IS NOT NULL;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_broadcast_completed ON broadcasts;
CREATE TRIGGER trigger_notify_broadcast_completed
  AFTER UPDATE ON broadcasts
  FOR EACH ROW
  EXECUTE FUNCTION notify_broadcast_completed();
