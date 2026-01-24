-- Admin & Sponsor Outcome-Based Notifications
-- Minimal implementation for critical business outcomes

-- 1. Admin: High-confidence flagged content
CREATE OR REPLACE FUNCTION notify_admin_flagged_content()
RETURNS TRIGGER AS $$
DECLARE
  admin_emails text[];
BEGIN
  IF NEW.confidence >= 0.8 AND NEW.escalation_suggested = true THEN
    SELECT array_agg(email) INTO admin_emails 
    FROM admin_users 
    WHERE active = true;
    
    INSERT INTO notification_log (
      notification_type, recipient, channel, priority, 
      message_content, metadata, delivery_status
    )
    SELECT 
      'admin_flagged_content',
      unnest(admin_emails),
      'email',
      4,
      'High-confidence ' || NEW.advisory_type || ' detected (confidence: ' || (NEW.confidence * 100)::int || '%). Review required.',
      jsonb_build_object('advisory_id', NEW.id, 'message_id', NEW.message_id, 'moment_id', NEW.moment_id),
      'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_admin_flagged_content
AFTER INSERT ON advisories
FOR EACH ROW
EXECUTE FUNCTION notify_admin_flagged_content();

-- 2. Admin: Broadcast completed
CREATE OR REPLACE FUNCTION notify_admin_broadcast_completed()
RETURNS TRIGGER AS $$
DECLARE
  admin_emails text[];
  moment_title text;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    SELECT array_agg(email) INTO admin_emails 
    FROM admin_users 
    WHERE active = true;
    
    SELECT title INTO moment_title FROM moments WHERE id = NEW.moment_id;
    
    INSERT INTO notification_log (
      notification_type, recipient, channel, priority,
      message_content, metadata, delivery_status, broadcast_id
    )
    SELECT 
      'admin_broadcast_completed',
      unnest(admin_emails),
      'email',
      2,
      'Broadcast completed: "' || moment_title || '" - ' || NEW.success_count || '/' || NEW.recipient_count || ' delivered (' || ROUND((NEW.success_count::decimal / NULLIF(NEW.recipient_count, 0) * 100), 1) || '%)',
      jsonb_build_object('broadcast_id', NEW.id, 'moment_id', NEW.moment_id),
      'pending',
      NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_admin_broadcast_completed
AFTER UPDATE ON broadcasts
FOR EACH ROW
EXECUTE FUNCTION notify_admin_broadcast_completed();

-- 3. Admin: Broadcast failed
CREATE OR REPLACE FUNCTION notify_admin_broadcast_failed()
RETURNS TRIGGER AS $$
DECLARE
  admin_emails text[];
  moment_title text;
BEGIN
  IF NEW.status = 'failed' AND OLD.status != 'failed' THEN
    SELECT array_agg(email) INTO admin_emails 
    FROM admin_users 
    WHERE active = true;
    
    SELECT title INTO moment_title FROM moments WHERE id = NEW.moment_id;
    
    INSERT INTO notification_log (
      notification_type, recipient, channel, priority,
      message_content, metadata, delivery_status, broadcast_id
    )
    SELECT 
      'admin_broadcast_failed',
      unnest(admin_emails),
      'email',
      4,
      'URGENT: Broadcast failed for "' || moment_title || '" - ' || NEW.failure_count || ' failures. Check error_details.',
      jsonb_build_object('broadcast_id', NEW.id, 'moment_id', NEW.moment_id, 'error_details', NEW.error_details),
      'pending',
      NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_admin_broadcast_failed
AFTER UPDATE ON broadcasts
FOR EACH ROW
EXECUTE FUNCTION notify_admin_broadcast_failed();

-- 4. Admin: Campaign pending review
CREATE OR REPLACE FUNCTION notify_admin_campaign_pending()
RETURNS TRIGGER AS $$
DECLARE
  admin_emails text[];
  sponsor_name text;
BEGIN
  IF NEW.status = 'pending_review' THEN
    SELECT array_agg(email) INTO admin_emails 
    FROM admin_users 
    WHERE active = true;
    
    SELECT display_name INTO sponsor_name FROM sponsors WHERE id = NEW.sponsor_id;
    
    INSERT INTO notification_log (
      notification_type, recipient, channel, priority,
      message_content, metadata, delivery_status
    )
    SELECT 
      'admin_campaign_pending',
      unnest(admin_emails),
      'email',
      3,
      'New campaign from ' || COALESCE(sponsor_name, 'Unknown Sponsor') || ' needs review: "' || NEW.title || '"',
      jsonb_build_object('campaign_id', NEW.id, 'sponsor_id', NEW.sponsor_id),
      'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_admin_campaign_pending
AFTER INSERT ON campaigns
FOR EACH ROW
EXECUTE FUNCTION notify_admin_campaign_pending();

-- 5. Sponsor: Campaign approved
CREATE OR REPLACE FUNCTION notify_sponsor_campaign_approved()
RETURNS TRIGGER AS $$
DECLARE
  sponsor_email text;
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending_review' THEN
    SELECT contact_email INTO sponsor_email FROM sponsors WHERE id = NEW.sponsor_id;
    
    IF sponsor_email IS NOT NULL THEN
      INSERT INTO notification_log (
        notification_type, recipient, channel, priority,
        message_content, metadata, delivery_status
      ) VALUES (
        'sponsor_campaign_approved',
        sponsor_email,
        'email',
        3,
        'Your campaign "' || NEW.title || '" has been approved and is ready to broadcast.',
        jsonb_build_object('campaign_id', NEW.id),
        'pending'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sponsor_campaign_approved
AFTER UPDATE ON campaigns
FOR EACH ROW
EXECUTE FUNCTION notify_sponsor_campaign_approved();

-- 6. Sponsor: Campaign completed
CREATE OR REPLACE FUNCTION notify_sponsor_campaign_completed()
RETURNS TRIGGER AS $$
DECLARE
  sponsor_email text;
  total_reach int;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    SELECT contact_email INTO sponsor_email FROM sponsors WHERE id = NEW.sponsor_id;
    
    -- Get total reach from broadcasts
    SELECT COALESCE(SUM(success_count), 0) INTO total_reach
    FROM broadcasts WHERE campaign_id = NEW.id;
    
    IF sponsor_email IS NOT NULL THEN
      INSERT INTO notification_log (
        notification_type, recipient, channel, priority,
        message_content, metadata, delivery_status
      ) VALUES (
        'sponsor_campaign_completed',
        sponsor_email,
        'email',
        2,
        'Campaign "' || NEW.title || '" completed! Reached ' || total_reach || ' subscribers across ' || array_length(NEW.target_regions, 1) || ' regions.',
        jsonb_build_object('campaign_id', NEW.id, 'total_reach', total_reach),
        'pending'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sponsor_campaign_completed
AFTER UPDATE ON campaigns
FOR EACH ROW
EXECUTE FUNCTION notify_sponsor_campaign_completed();

-- 7. Sponsor: Sponsored moment published
CREATE OR REPLACE FUNCTION notify_sponsor_moment_published()
RETURNS TRIGGER AS $$
DECLARE
  sponsor_email text;
BEGIN
  IF NEW.status = 'broadcasted' AND OLD.status != 'broadcasted' AND NEW.is_sponsored = true THEN
    SELECT contact_email INTO sponsor_email FROM sponsors WHERE id = NEW.sponsor_id;
    
    IF sponsor_email IS NOT NULL THEN
      INSERT INTO notification_log (
        notification_type, recipient, channel, priority,
        message_content, metadata, delivery_status
      ) VALUES (
        'sponsor_moment_published',
        sponsor_email,
        'email',
        2,
        'Your sponsored moment "' || NEW.title || '" is now live in ' || NEW.region || '!',
        jsonb_build_object('moment_id', NEW.id, 'region', NEW.region),
        'pending'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sponsor_moment_published
AFTER UPDATE ON moments
FOR EACH ROW
EXECUTE FUNCTION notify_sponsor_moment_published();
