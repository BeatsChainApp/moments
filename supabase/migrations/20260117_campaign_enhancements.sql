-- Campaign System Enhancement Migration
-- Adds authority, budget tracking, and analytics support
-- Run Date: January 17, 2026

-- Add authority and tracking fields to campaigns
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS created_by TEXT,
ADD COLUMN IF NOT EXISTS authority_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS institution_name TEXT,
ADD COLUMN IF NOT EXISTS template_name TEXT,
ADD COLUMN IF NOT EXISTS broadcast_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reach INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10,2) DEFAULT 0;

-- Add campaign_id to moments for tracking
ALTER TABLE moments 
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(id);

CREATE INDEX IF NOT EXISTS idx_moments_campaign ON moments(campaign_id);

-- Campaign performance view
CREATE OR REPLACE VIEW campaign_performance AS
SELECT 
  c.id,
  c.title,
  c.status,
  c.created_by,
  c.authority_level,
  c.institution_name,
  c.template_name,
  c.sponsor_id,
  s.display_name as sponsor_name,
  c.budget,
  c.total_cost,
  c.broadcast_count,
  c.total_reach,
  CASE 
    WHEN c.total_cost > 0 THEN ROUND((c.total_reach::DECIMAL / c.total_cost), 2)
    ELSE 0 
  END as reach_per_rand,
  CASE 
    WHEN c.budget > 0 THEN ROUND((c.total_cost / c.budget * 100)::NUMERIC, 1)
    ELSE 0 
  END as budget_used_percent,
  COUNT(DISTINCT m.id) as moments_created,
  COUNT(DISTINCT b.id) as broadcasts_sent,
  COALESCE(SUM(b.success_count), 0) as total_success,
  COALESCE(SUM(b.failure_count), 0) as total_failures,
  CASE 
    WHEN SUM(b.recipient_count) > 0 THEN 
      ROUND((SUM(b.success_count)::DECIMAL / SUM(b.recipient_count) * 100)::NUMERIC, 1)
    ELSE 0 
  END as success_rate,
  c.created_at,
  c.updated_at
FROM campaigns c
LEFT JOIN sponsors s ON c.sponsor_id = s.id
LEFT JOIN moments m ON m.campaign_id = c.id
LEFT JOIN broadcasts b ON b.moment_id = m.id
GROUP BY c.id, c.title, c.status, c.created_by, c.authority_level, 
         c.institution_name, c.template_name, c.sponsor_id, s.display_name,
         c.budget, c.total_cost, c.broadcast_count, c.total_reach,
         c.created_at, c.updated_at;

-- Template performance tracking
CREATE TABLE IF NOT EXISTS template_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  campaign_id UUID REFERENCES campaigns(id),
  authority_level INTEGER,
  sends INTEGER DEFAULT 0,
  deliveries INTEGER DEFAULT 0,
  failures INTEGER DEFAULT 0,
  delivery_rate DECIMAL(5,2),
  avg_cost_per_send DECIMAL(6,3),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_performance_template ON template_performance(template_name);
CREATE INDEX IF NOT EXISTS idx_template_performance_campaign ON template_performance(campaign_id);

-- Function to log template performance
CREATE OR REPLACE FUNCTION log_template_performance(
  p_template_name TEXT,
  p_campaign_id UUID,
  p_authority_level INTEGER,
  p_sends INTEGER,
  p_deliveries INTEGER,
  p_failures INTEGER,
  p_cost DECIMAL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO template_performance (
    template_name,
    campaign_id,
    authority_level,
    sends,
    deliveries,
    failures,
    delivery_rate,
    avg_cost_per_send
  ) VALUES (
    p_template_name,
    p_campaign_id,
    p_authority_level,
    p_sends,
    p_deliveries,
    p_failures,
    CASE WHEN p_sends > 0 THEN ROUND((p_deliveries::DECIMAL / p_sends * 100)::NUMERIC, 2) ELSE 0 END,
    CASE WHEN p_sends > 0 THEN ROUND((p_cost / p_sends)::NUMERIC, 3) ELSE 0 END
  );
END;
$$ LANGUAGE plpgsql;

-- Authority lookup function for campaigns
CREATE OR REPLACE FUNCTION lookup_campaign_authority(p_user_identifier TEXT)
RETURNS TABLE (
  authority_level INTEGER,
  role_label TEXT,
  blast_radius INTEGER,
  scope TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ap.authority_level,
    ap.role_label,
    ap.blast_radius,
    ap.scope
  FROM authority_profiles ap
  WHERE ap.user_identifier = p_user_identifier
    AND ap.status = 'active'
    AND (ap.valid_until IS NULL OR ap.valid_until > NOW())
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Update campaign stats after broadcast
CREATE OR REPLACE FUNCTION update_campaign_stats(
  p_campaign_id UUID,
  p_recipient_count INTEGER,
  p_cost DECIMAL
) RETURNS VOID AS $$
BEGIN
  UPDATE campaigns 
  SET 
    broadcast_count = broadcast_count + 1,
    total_reach = total_reach + p_recipient_count,
    total_cost = total_cost + p_cost,
    updated_at = NOW()
  WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON VIEW campaign_performance IS 'Comprehensive campaign analytics with budget, reach, and template performance';
COMMENT ON TABLE template_performance IS 'Tracks WhatsApp template performance per campaign';
COMMENT ON FUNCTION log_template_performance IS 'Logs template usage and delivery metrics';
COMMENT ON FUNCTION update_campaign_stats IS 'Updates campaign totals after each broadcast';
