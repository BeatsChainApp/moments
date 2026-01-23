-- Fix notify_authority_verified trigger to use user_identifier instead of phone_number
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
      'recipient_phone', NEW.user_identifier,
      'priority', 3,
      'message_content', 'Congratulations! Your authority status has been verified. You can now submit moments with Level ' || NEW.authority_level || ' authority. Blast radius: ' || NEW.blast_radius || ' subscribers.',
      'metadata', jsonb_build_object('authority_id', NEW.id, 'authority_level', NEW.authority_level)
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
