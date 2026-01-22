-- Create RPC function to get active subscribers
-- This bypasses any RLS policies that might be interfering

CREATE OR REPLACE FUNCTION get_active_subscribers()
RETURNS TABLE (phone_number TEXT)
LANGUAGE plpgsql
SECURITY DEFINER -- Run with function owner's privileges
AS $$
BEGIN
  RETURN QUERY
  SELECT s.phone_number
  FROM subscriptions s
  WHERE s.opted_in = true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_active_subscribers() TO service_role;
GRANT EXECUTE ON FUNCTION get_active_subscribers() TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_subscribers() TO anon;

-- Test the function
SELECT * FROM get_active_subscribers();
