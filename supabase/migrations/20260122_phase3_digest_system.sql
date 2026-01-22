-- Phase 3: Digest System & Scheduled Notifications
-- Date: January 22, 2026

-- Create cron job for daily digests (runs at 8 AM daily)
SELECT cron.schedule(
  'daily-digest-processor',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/notification-digest-processor',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('frequency', 'daily')
  );
  $$
);

-- Create cron job for weekly digests (runs Monday 8 AM)
SELECT cron.schedule(
  'weekly-digest-processor',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/notification-digest-processor',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('frequency', 'weekly')
  );
  $$
);

-- Create function to process scheduled notifications
CREATE OR REPLACE FUNCTION process_scheduled_notifications()
RETURNS void AS $$
DECLARE
  notification_record RECORD;
BEGIN
  FOR notification_record IN
    SELECT * FROM notification_log
    WHERE status = 'queued'
      AND scheduled_for IS NOT NULL
      AND scheduled_for <= NOW()
    LIMIT 100
  LOOP
    -- Call orchestrator via HTTP
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/notification-orchestrator',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'notification_id', notification_record.id,
        'recipient_phone', notification_record.recipient_phone,
        'message_content', notification_record.message_content
      )
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create cron job for scheduled notifications (runs every 5 minutes)
SELECT cron.schedule(
  'scheduled-notifications-processor',
  '*/5 * * * *',
  'SELECT process_scheduled_notifications();'
);

COMMENT ON FUNCTION process_scheduled_notifications IS 'Phase 3: Processes queued notifications that are due to be sent';
