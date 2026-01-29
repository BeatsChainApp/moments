-- Create public stats function
CREATE OR REPLACE FUNCTION get_public_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_moments', (SELECT COUNT(*) FROM moments WHERE status = 'broadcasted'),
    'active_subscribers', (SELECT COUNT(*) FROM subscriptions WHERE opted_in = true),
    'total_broadcasts', (SELECT COUNT(*) FROM broadcasts WHERE status = 'completed')
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
