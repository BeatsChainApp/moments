-- Phase 4: Transactional Notifications
-- Date: January 22, 2026

-- Trigger: Authority verified notification
CREATE OR REPLACE FUNCTION notify_authority_verified()
RETURNS TRIGGER AS $$
DECLARE
  notif_type_id uuid;
BEGIN
  SELECT id INTO notif_type_id FROM notification_types WHERE type_code = 'authority_verified';
  
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/notification-orchestrator',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'notification_type', 'authority_verified',
      'recipient_phone', NEW.phone_number,
      'priority', 3,
      'message_content', 'Congratulations! Your authority status has been verified. You can now submit moments with Level ' || NEW.authority_level || ' authority. Blast radius: ' || NEW.blast_radius || ' subscribers.',
      'metadata', jsonb_build_object('authority_id', NEW.id, 'authority_level', NEW.authority_level)
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_authority_verified
AFTER INSERT ON authority_profiles
FOR EACH ROW
WHEN (NEW.status = 'active')
EXECUTE FUNCTION notify_authority_verified();

-- Trigger: Authority suspended notification
CREATE OR REPLACE FUNCTION notify_authority_suspended()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'active' AND NEW.status = 'suspended' THEN
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/notification-orchestrator',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'notification_type', 'authority_suspended',
        'recipient_phone', NEW.phone_number,
        'priority', 4,
        'message_content', 'Your authority status has been suspended. Please contact support for more information.',
        'metadata', jsonb_build_object('authority_id', NEW.id, 'reason', NEW.suspension_reason)
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_authority_suspended
AFTER UPDATE ON authority_profiles
FOR EACH ROW
EXECUTE FUNCTION notify_authority_suspended();

-- Trigger: Broadcast completed notification (for authority users)
CREATE OR REPLACE FUNCTION notify_broadcast_completed()
RETURNS TRIGGER AS $$
DECLARE
  moment_creator text;
  authority_phone text;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Get moment creator
    SELECT created_by INTO moment_creator FROM moments WHERE id = NEW.moment_id;
    
    -- Get authority phone if creator is authority
    SELECT phone_number INTO authority_phone 
    FROM authority_profiles 
    WHERE phone_number = moment_creator OR role_label = moment_creator;
    
    IF authority_phone IS NOT NULL THEN
      PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/notification-orchestrator',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_key'),
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'notification_type', 'broadcast_completed',
          'recipient_phone', authority_phone,
          'priority', 2,
          'message_content', 'Your broadcast completed successfully! Sent: ' || NEW.success_count || ', Failed: ' || NEW.failure_count || ', Total: ' || NEW.recipient_count,
          'metadata', jsonb_build_object('broadcast_id', NEW.id, 'moment_id', NEW.moment_id)
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_broadcast_completed
AFTER UPDATE ON broadcasts
FOR EACH ROW
EXECUTE FUNCTION notify_broadcast_completed();

-- Trigger: Quota warning (80% threshold)
CREATE OR REPLACE FUNCTION check_quota_warning()
RETURNS TRIGGER AS $$
DECLARE
  authority_record RECORD;
  daily_count int;
  quota_limit int;
BEGIN
  -- Get authority profile
  SELECT * INTO authority_record 
  FROM authority_profiles 
  WHERE phone_number = NEW.created_by OR role_label = NEW.created_by;
  
  IF authority_record IS NOT NULL THEN
    -- Count broadcasts today
    SELECT COUNT(*) INTO daily_count
    FROM broadcasts b
    JOIN moments m ON m.id = b.moment_id
    WHERE m.created_by = NEW.created_by
      AND b.broadcast_started_at >= CURRENT_DATE;
    
    quota_limit := COALESCE(authority_record.daily_broadcast_limit, 10);
    
    -- Check if at 80% threshold
    IF daily_count >= (quota_limit * 0.8) AND daily_count < quota_limit THEN
      PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/notification-orchestrator',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_key'),
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'notification_type', 'quota_warning',
          'recipient_phone', authority_record.phone_number,
          'priority', 3,
          'message_content', 'Quota Warning: You have used ' || daily_count || ' of ' || quota_limit || ' daily broadcasts. ' || (quota_limit - daily_count) || ' remaining.',
          'metadata', jsonb_build_object('daily_count', daily_count, 'quota_limit', quota_limit)
        )
      );
    END IF;
    
    -- Check if quota exceeded
    IF daily_count >= quota_limit THEN
      PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/notification-orchestrator',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_key'),
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'notification_type', 'quota_exceeded',
          'recipient_phone', authority_record.phone_number,
          'priority', 4,
          'message_content', 'Daily broadcast quota exceeded (' || quota_limit || '). Additional broadcasts will be queued until tomorrow.',
          'metadata', jsonb_build_object('daily_count', daily_count, 'quota_limit', quota_limit)
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_quota_check
AFTER INSERT ON broadcasts
FOR EACH ROW
EXECUTE FUNCTION check_quota_warning();

-- Function: Send moment approved notification
CREATE OR REPLACE FUNCTION notify_moment_approved(moment_id uuid)
RETURNS void AS $$
DECLARE
  moment_record RECORD;
BEGIN
  SELECT * INTO moment_record FROM moments WHERE id = moment_id;
  
  IF moment_record.created_by IS NOT NULL THEN
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/notification-orchestrator',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'notification_type', 'moment_approved',
        'recipient_phone', moment_record.created_by,
        'priority', 3,
        'message_content', 'Your moment "' || moment_record.title || '" has been approved and will be broadcasted soon!',
        'metadata', jsonb_build_object('moment_id', moment_id)
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Send moment rejected notification
CREATE OR REPLACE FUNCTION notify_moment_rejected(moment_id uuid, reason text)
RETURNS void AS $$
DECLARE
  moment_record RECORD;
BEGIN
  SELECT * INTO moment_record FROM moments WHERE id = moment_id;
  
  IF moment_record.created_by IS NOT NULL THEN
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/notification-orchestrator',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'notification_type', 'moment_rejected',
        'recipient_phone', moment_record.created_by,
        'priority', 2,
        'message_content', 'Your moment "' || moment_record.title || '" was not approved. Reason: ' || COALESCE(reason, 'Content policy violation'),
        'metadata', jsonb_build_object('moment_id', moment_id, 'reason', reason)
      )
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION notify_authority_verified IS 'Phase 4: Sends notification when authority status is granted';
COMMENT ON FUNCTION notify_authority_suspended IS 'Phase 4: Sends notification when authority status is suspended';
COMMENT ON FUNCTION notify_broadcast_completed IS 'Phase 4: Sends notification when broadcast completes';
COMMENT ON FUNCTION check_quota_warning IS 'Phase 4: Monitors and notifies about quota usage';
COMMENT ON FUNCTION notify_moment_approved IS 'Phase 4: Sends notification when moment is approved';
COMMENT ON FUNCTION notify_moment_rejected IS 'Phase 4: Sends notification when moment is rejected';
