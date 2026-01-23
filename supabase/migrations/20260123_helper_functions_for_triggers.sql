-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a function to get Supabase URL
CREATE OR REPLACE FUNCTION get_supabase_url()
RETURNS TEXT AS $$
BEGIN
  RETURN 'https://bxmdzcxejcxbinghtyfw.supabase.co';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a function to get service key
CREATE OR REPLACE FUNCTION get_service_key()
RETURNS TEXT AS $$
BEGIN
  -- Try to get from settings, fallback to empty (will fail gracefully with exception handling)
  RETURN COALESCE(
    current_setting('app.settings.service_role_key', true),
    ''
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update notify_authority_verified to use helper functions
CREATE OR REPLACE FUNCTION notify_authority_verified()
RETURNS TRIGGER AS $$
DECLARE
  service_key TEXT;
BEGIN
  service_key := get_service_key();
  
  BEGIN
    PERFORM net.http_post(
      url := get_supabase_url() || '/functions/v1/authority-notification',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || service_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'authority_id', NEW.id,
        'notification_type', 'granted',
        'phone_number', NEW.user_identifier,
        'authority_level', NEW.authority_level,
        'blast_radius', NEW.blast_radius
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Authority notification failed: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update notify_authority_suspended to use helper functions
CREATE OR REPLACE FUNCTION notify_authority_suspended()
RETURNS TRIGGER AS $$
DECLARE
  service_key TEXT;
BEGIN
  IF OLD.status = 'active' AND NEW.status = 'suspended' THEN
    service_key := get_service_key();
    
    BEGIN
      PERFORM net.http_post(
        url := get_supabase_url() || '/functions/v1/authority-notification',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || service_key,
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'authority_id', NEW.id,
          'notification_type', 'suspended',
          'phone_number', NEW.user_identifier
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Authority suspension notification failed: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
