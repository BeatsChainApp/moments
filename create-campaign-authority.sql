-- Create lookup_campaign_authority (alias to lookup_authority)
CREATE OR REPLACE FUNCTION lookup_campaign_authority(p_user_identifier TEXT)
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
  SELECT * FROM lookup_authority(p_user_identifier);
$$;

GRANT EXECUTE ON FUNCTION lookup_campaign_authority TO service_role, authenticated, anon;
