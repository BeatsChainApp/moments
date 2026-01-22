-- Drop and recreate get_active_subscribers with proper return type
DROP FUNCTION IF EXISTS get_active_subscribers() CASCADE;

CREATE OR REPLACE FUNCTION get_active_subscribers()
RETURNS TABLE(phone_number TEXT) 
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT phone_number::TEXT
  FROM subscriptions
  WHERE opted_in = true
    AND phone_number IS NOT NULL
    AND phone_number LIKE '+%';
$$;

GRANT EXECUTE ON FUNCTION get_active_subscribers() TO service_role;
GRANT EXECUTE ON FUNCTION get_active_subscribers() TO authenticated;
