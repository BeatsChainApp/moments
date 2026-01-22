-- FIX: get_active_subscribers returns wrong format
-- Run in Supabase SQL Editor NOW

CREATE OR REPLACE FUNCTION get_active_subscribers()
RETURNS TABLE (phone_number TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT phone_number::TEXT
  FROM subscriptions
  WHERE opted_in = true
    AND phone_number IS NOT NULL
    AND phone_number LIKE '+%';
$$;
