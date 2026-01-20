-- Phase 4: A/B Testing & Revenue Attribution
-- Advanced campaign optimization features

-- Campaign variants for A/B testing
CREATE TABLE IF NOT EXISTS campaign_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL, -- 'A', 'B', 'C', 'control'
  template_name TEXT,
  content_variation TEXT,
  title_variation TEXT,
  subscriber_percentage DECIMAL(3,2) CHECK (subscriber_percentage > 0 AND subscriber_percentage <= 1),
  is_control BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'winner', 'loser')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Variant performance metrics
CREATE TABLE IF NOT EXISTS variant_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID REFERENCES campaign_variants(id) ON DELETE CASCADE,
  sends INTEGER DEFAULT 0,
  deliveries INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(10,2) DEFAULT 0,
  delivery_rate DECIMAL(5,2),
  ctr DECIMAL(5,2), -- Click-through rate
  conversion_rate DECIMAL(5,2),
  revenue_per_send DECIMAL(6,2),
  confidence_level DECIMAL(5,2), -- Statistical significance
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Click tracking for dynamic links
CREATE TABLE IF NOT EXISTS link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id UUID REFERENCES moments(id),
  campaign_id UUID REFERENCES campaigns(id),
  variant_id UUID REFERENCES campaign_variants(id),
  subscriber_phone TEXT,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  ip_address TEXT,
  referrer TEXT
);

CREATE INDEX IF NOT EXISTS idx_link_clicks_moment ON link_clicks(moment_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_campaign ON link_clicks(campaign_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_variant ON link_clicks(variant_id);

-- Conversion tracking
CREATE TABLE IF NOT EXISTS conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id UUID REFERENCES moments(id),
  campaign_id UUID REFERENCES campaigns(id),
  variant_id UUID REFERENCES campaign_variants(id),
  subscriber_phone TEXT,
  conversion_type TEXT NOT NULL, -- 'signup', 'purchase', 'donation', 'registration'
  conversion_value DECIMAL(10,2),
  attribution_model TEXT DEFAULT 'last_click', -- 'first_click', 'last_click', 'linear'
  converted_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_conversions_campaign ON conversions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_conversions_variant ON conversions(variant_id);

-- Revenue attribution
CREATE TABLE IF NOT EXISTS revenue_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  variant_id UUID REFERENCES campaign_variants(id),
  sponsor_id UUID REFERENCES sponsors(id),
  revenue_amount DECIMAL(10,2) NOT NULL,
  revenue_source TEXT, -- 'sponsorship', 'conversion', 'partnership'
  attribution_weight DECIMAL(3,2) DEFAULT 1.0,
  attributed_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B test results view
CREATE OR REPLACE VIEW ab_test_results AS
SELECT 
  cv.campaign_id,
  c.title as campaign_title,
  cv.id as variant_id,
  cv.variant_name,
  cv.is_control,
  cv.status as variant_status,
  vp.sends,
  vp.deliveries,
  vp.clicks,
  vp.conversions,
  vp.revenue,
  vp.delivery_rate,
  vp.ctr,
  vp.conversion_rate,
  vp.revenue_per_send,
  vp.confidence_level,
  CASE 
    WHEN vp.revenue > 0 AND vp.sends > 0 THEN 
      ROUND((vp.revenue / (vp.sends * 0.12))::NUMERIC, 2)
    ELSE 0 
  END as roi_multiple
FROM campaign_variants cv
JOIN campaigns c ON cv.campaign_id = c.id
LEFT JOIN variant_performance vp ON cv.id = vp.variant_id
ORDER BY cv.campaign_id, cv.variant_name;

-- Function to distribute subscribers for A/B test
CREATE OR REPLACE FUNCTION distribute_ab_test_subscribers(
  p_campaign_id UUID,
  p_subscribers TEXT[]
) RETURNS TABLE (
  variant_id UUID,
  variant_name TEXT,
  subscribers TEXT[]
) AS $$
DECLARE
  v_variant RECORD;
  v_start_idx INTEGER := 1;
  v_end_idx INTEGER;
  v_subscriber_count INTEGER := array_length(p_subscribers, 1);
BEGIN
  FOR v_variant IN 
    SELECT id, variant_name, subscriber_percentage 
    FROM campaign_variants 
    WHERE campaign_id = p_campaign_id 
    AND status = 'active'
    ORDER BY variant_name
  LOOP
    v_end_idx := LEAST(
      v_start_idx + FLOOR(v_subscriber_count * v_variant.subscriber_percentage)::INTEGER - 1,
      v_subscriber_count
    );
    
    RETURN QUERY SELECT 
      v_variant.id,
      v_variant.variant_name,
      p_subscribers[v_start_idx:v_end_idx];
    
    v_start_idx := v_end_idx + 1;
    
    EXIT WHEN v_start_idx > v_subscriber_count;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to track click
CREATE OR REPLACE FUNCTION track_click(
  p_moment_id UUID,
  p_campaign_id UUID,
  p_variant_id UUID,
  p_subscriber_phone TEXT,
  p_user_agent TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO link_clicks (
    moment_id,
    campaign_id,
    variant_id,
    subscriber_phone,
    user_agent
  ) VALUES (
    p_moment_id,
    p_campaign_id,
    p_variant_id,
    p_subscriber_phone,
    p_user_agent
  );
  
  -- Update variant performance
  IF p_variant_id IS NOT NULL THEN
    UPDATE variant_performance 
    SET clicks = clicks + 1,
        ctr = CASE WHEN sends > 0 THEN ROUND(((clicks + 1)::DECIMAL / sends * 100)::NUMERIC, 2) ELSE 0 END,
        updated_at = NOW()
    WHERE variant_id = p_variant_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Wrapper function with defaults for optional parameters
CREATE OR REPLACE FUNCTION track_click_simple(
  p_moment_id UUID,
  p_campaign_id UUID DEFAULT NULL,
  p_variant_id UUID DEFAULT NULL,
  p_subscriber_phone TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  PERFORM track_click(
    p_moment_id,
    COALESCE(p_campaign_id, '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(p_variant_id, '00000000-0000-0000-0000-000000000000'::UUID),
    COALESCE(p_subscriber_phone, ''),
    COALESCE(p_user_agent, '')
  );
END;
$$ LANGUAGE plpgsql;

-- Function to track conversion
CREATE OR REPLACE FUNCTION track_conversion(
  p_moment_id UUID,
  p_campaign_id UUID,
  p_variant_id UUID,
  p_subscriber_phone TEXT,
  p_conversion_type TEXT,
  p_conversion_value DECIMAL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO conversions (
    moment_id,
    campaign_id,
    variant_id,
    subscriber_phone,
    conversion_type,
    conversion_value
  ) VALUES (
    p_moment_id,
    p_campaign_id,
    p_variant_id,
    p_subscriber_phone,
    p_conversion_type,
    p_conversion_value
  );
  
  -- Update variant performance
  IF p_variant_id IS NOT NULL THEN
    UPDATE variant_performance 
    SET conversions = conversions + 1,
        revenue = revenue + p_conversion_value,
        conversion_rate = CASE WHEN sends > 0 THEN ROUND(((conversions + 1)::DECIMAL / sends * 100)::NUMERIC, 2) ELSE 0 END,
        revenue_per_send = CASE WHEN sends > 0 THEN ROUND(((revenue + p_conversion_value) / sends)::NUMERIC, 2) ELSE 0 END,
        updated_at = NOW()
    WHERE variant_id = p_variant_id;
  END IF;
  
  -- Log revenue attribution
  IF p_conversion_value > 0 THEN
    INSERT INTO revenue_attribution (
      campaign_id,
      variant_id,
      revenue_amount,
      revenue_source
    ) VALUES (
      p_campaign_id,
      p_variant_id,
      p_conversion_value,
      'conversion'
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Wrapper function with defaults for optional parameters
CREATE OR REPLACE FUNCTION track_conversion_simple(
  p_moment_id UUID,
  p_campaign_id UUID,
  p_variant_id UUID DEFAULT NULL,
  p_subscriber_phone TEXT DEFAULT '',
  p_conversion_type TEXT DEFAULT 'unknown',
  p_conversion_value DECIMAL DEFAULT 0
) RETURNS VOID AS $$
BEGIN
  PERFORM track_conversion(
    p_moment_id,
    p_campaign_id,
    COALESCE(p_variant_id, '00000000-0000-0000-0000-000000000000'::UUID),
    p_subscriber_phone,
    p_conversion_type,
    p_conversion_value
  );
END;
$$ LANGUAGE plpgsql;

-- Function to calculate statistical significance
CREATE OR REPLACE FUNCTION calculate_ab_significance(
  p_variant_a_id UUID,
  p_variant_b_id UUID
) RETURNS DECIMAL AS $$
DECLARE
  v_a_conversions INTEGER;
  v_a_sends INTEGER;
  v_b_conversions INTEGER;
  v_b_sends INTEGER;
  v_p_a DECIMAL;
  v_p_b DECIMAL;
  v_pooled_p DECIMAL;
  v_se DECIMAL;
  v_z_score DECIMAL;
BEGIN
  -- Get variant A stats
  SELECT conversions, sends INTO v_a_conversions, v_a_sends
  FROM variant_performance WHERE variant_id = p_variant_a_id;
  
  -- Get variant B stats
  SELECT conversions, sends INTO v_b_conversions, v_b_sends
  FROM variant_performance WHERE variant_id = p_variant_b_id;
  
  -- Calculate conversion rates
  v_p_a := CASE WHEN v_a_sends > 0 THEN v_a_conversions::DECIMAL / v_a_sends ELSE 0 END;
  v_p_b := CASE WHEN v_b_sends > 0 THEN v_b_conversions::DECIMAL / v_b_sends ELSE 0 END;
  
  -- Calculate pooled probability
  v_pooled_p := (v_a_conversions + v_b_conversions)::DECIMAL / (v_a_sends + v_b_sends);
  
  -- Calculate standard error
  v_se := SQRT(v_pooled_p * (1 - v_pooled_p) * (1.0/v_a_sends + 1.0/v_b_sends));
  
  -- Calculate z-score
  v_z_score := ABS(v_p_a - v_p_b) / NULLIF(v_se, 0);
  
  -- Return confidence level (simplified)
  RETURN CASE 
    WHEN v_z_score >= 2.58 THEN 99.0
    WHEN v_z_score >= 1.96 THEN 95.0
    WHEN v_z_score >= 1.65 THEN 90.0
    ELSE ROUND((v_z_score / 2.58 * 99)::NUMERIC, 1)
  END;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_variants_campaign ON campaign_variants(campaign_id);
CREATE INDEX IF NOT EXISTS idx_variant_performance_variant ON variant_performance(variant_id);
CREATE INDEX IF NOT EXISTS idx_revenue_attribution_campaign ON revenue_attribution(campaign_id);

COMMENT ON TABLE campaign_variants IS 'A/B test variants for campaigns';
COMMENT ON TABLE variant_performance IS 'Performance metrics per variant';
COMMENT ON TABLE link_clicks IS 'Click tracking for dynamic links';
COMMENT ON TABLE conversions IS 'Conversion tracking with attribution';
COMMENT ON TABLE revenue_attribution IS 'Revenue attribution per campaign/variant';
COMMENT ON FUNCTION distribute_ab_test_subscribers IS 'Distributes subscribers across A/B test variants';
COMMENT ON FUNCTION track_click IS 'Tracks link clicks and updates variant performance';
COMMENT ON FUNCTION track_conversion IS 'Tracks conversions and updates revenue attribution';
