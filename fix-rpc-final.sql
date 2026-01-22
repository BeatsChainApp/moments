-- FINAL FIX: Ensure RPC function returns correct format
-- Run in Supabase SQL Editor

DROP FUNCTION IF EXISTS get_active_subscribers();

CREATE FUNCTION get_active_subscribers()
RETURNS TABLE (phone_number TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT phone_number::TEXT
  FROM subscriptions
  WHERE opted_in = true
    AND phone_number IS NOT NULL
    AND phone_number LIKE '+%';
$$;

GRANT EXECUTE ON FUNCTION get_active_subscribers() TO service_role;
GRANT EXECUTE ON FUNCTION get_active_subscribers() TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_subscribers() TO anon;

-- Test it
SELECT * FROM get_active_subscribers();
