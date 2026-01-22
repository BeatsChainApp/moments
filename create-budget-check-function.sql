-- Drop and recreate check_campaign_budget function
DROP FUNCTION IF EXISTS check_campaign_budget(UUID, NUMERIC) CASCADE;

CREATE OR REPLACE FUNCTION check_campaign_budget(
  p_campaign_id UUID,
  p_spend_amount NUMERIC
)
RETURNS TABLE(allowed BOOLEAN, reason TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_budget NUMERIC;
  v_total_cost NUMERIC;
  v_remaining NUMERIC;
BEGIN
  -- Get campaign budget and current spend
  SELECT budget, COALESCE(total_cost, 0)
  INTO v_budget, v_total_cost
  FROM campaigns
  WHERE id = p_campaign_id;
  
  -- If no budget set, allow
  IF v_budget IS NULL OR v_budget = 0 THEN
    RETURN QUERY SELECT true, 'No budget limit'::TEXT;
    RETURN;
  END IF;
  
  -- Calculate remaining budget
  v_remaining := v_budget - v_total_cost;
  
  -- Check if spend would exceed budget
  IF p_spend_amount > v_remaining THEN
    RETURN QUERY SELECT false, ('Insufficient budget. Available: R' || v_remaining || ', Required: R' || p_spend_amount)::TEXT;
  ELSE
    RETURN QUERY SELECT true, 'Budget available'::TEXT;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION check_campaign_budget(UUID, NUMERIC) TO service_role;
GRANT EXECUTE ON FUNCTION check_campaign_budget(UUID, NUMERIC) TO authenticated;
