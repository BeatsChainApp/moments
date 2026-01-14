-- PRODUCTION HARDENING
-- Rate limiting, audit logging, performance optimization

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(identifier, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON rate_limits(identifier, endpoint, window_start);

-- Enhanced audit logging
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES admin_users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  changes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- Feature flags
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  description TEXT,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Error tracking
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  context JSONB,
  severity TEXT CHECK (severity IN ('low','medium','high','critical')),
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_unresolved ON error_logs(resolved, created_at DESC);

-- Performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  response_time_ms INTEGER NOT NULL,
  status_code INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_endpoint ON performance_metrics(endpoint, timestamp DESC);

-- RLS policies
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin access" ON rate_limits FOR ALL USING (is_admin());
CREATE POLICY "Admin access" ON audit_logs FOR ALL USING (is_admin());
CREATE POLICY "Admin access" ON feature_flags FOR ALL USING (is_admin());
CREATE POLICY "Admin access" ON error_logs FOR ALL USING (is_admin());
CREATE POLICY "Admin access" ON performance_metrics FOR ALL USING (is_admin());

-- Initial feature flags
INSERT INTO feature_flags (flag_key, enabled, description) VALUES
('comments_enabled', true, 'Enable comments on moments'),
('auto_moderation', true, 'Auto-approve low-risk content'),
('media_uploads', true, 'Allow media uploads'),
('campaigns', true, 'Enable campaign system')
ON CONFLICT (flag_key) DO NOTHING;
