-- Fix lookup_campaign_authority return type
DROP FUNCTION IF EXISTS lookup_campaign_authority(TEXT);

CREATE FUNCTION lookup_campaign_authority(p_user_identifier TEXT)
RETURNS SETOF authority_profiles
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM authority_profiles
  WHERE user_identifier = p_user_identifier
    AND status = 'active'
    AND (valid_until IS NULL OR valid_until > NOW())
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION lookup_campaign_authority TO service_role, authenticated, anon;
