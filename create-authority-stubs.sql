-- Create stub authority functions (return null = no authority)
-- Run in Supabase SQL Editor

CREATE OR REPLACE FUNCTION lookup_campaign_authority(p_user_identifier TEXT)
RETURNS TABLE (
  id UUID,
  authority_level INT,
  blast_radius INT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT NULL::UUID, NULL::INT, NULL::INT WHERE FALSE;
$$;

CREATE OR REPLACE FUNCTION lookup_authority(p_user_identifier TEXT)
RETURNS TABLE (
  id UUID,
  authority_level INT,
  role_label TEXT,
  scope TEXT,
  scope_identifier TEXT,
  approval_mode TEXT,
  blast_radius INT,
  risk_threshold NUMERIC,
  status TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT NULL::UUID, NULL::INT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::INT, NULL::NUMERIC, NULL::TEXT WHERE FALSE;
$$;

GRANT EXECUTE ON FUNCTION lookup_campaign_authority TO service_role, authenticated, anon;
GRANT EXECUTE ON FUNCTION lookup_authority TO service_role, authenticated, anon;
