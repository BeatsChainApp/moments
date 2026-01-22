-- Drop the RPC function that's causing issues
DROP FUNCTION IF EXISTS get_active_subscribers() CASCADE;
