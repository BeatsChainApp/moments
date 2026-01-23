-- Phase 3: Authority WhatsApp Integration & Automation

-- Authority notifications log
CREATE TABLE IF NOT EXISTS authority_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  authority_id UUID REFERENCES authority_profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- granted, extended, suspended, revoked, expiry_warning
  days_until_expiry INTEGER,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered BOOLEAN DEFAULT false
);

-- Authority requests (self-service)
CREATE TABLE IF NOT EXISTS authority_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT NOT NULL,
  role_requested TEXT,
  institution TEXT,
  region TEXT,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES admin_users(id)
);

-- Conversation state for multi-step requests
CREATE TABLE IF NOT EXISTS authority_request_state (
  phone_number TEXT PRIMARY KEY,
  request_id UUID REFERENCES authority_requests(id) ON DELETE CASCADE,
  current_step TEXT, -- awaiting_role, awaiting_institution, awaiting_region
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics function
CREATE OR REPLACE FUNCTION get_authority_analytics(
  authority_id UUID,
  days INTEGER DEFAULT 30
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  phone TEXT;
BEGIN
  SELECT user_identifier INTO phone FROM authority_profiles WHERE id = authority_id;
  
  SELECT json_build_object(
    'messages_sent', COUNT(DISTINCT m.id),
    'total_recipients', COALESCE(SUM(b.recipient_count), 0),
    'avg_recipients', COALESCE(ROUND(AVG(b.recipient_count)), 0),
    'approval_rate', ROUND(
      COUNT(CASE WHEN m.processed = true THEN 1 END)::NUMERIC / 
      NULLIF(COUNT(*), 0) * 100, 1
    ),
    'last_broadcast', MAX(m.created_at)
  ) INTO result
  FROM messages m
  LEFT JOIN broadcasts b ON b.message_id = m.id
  WHERE m.from_number = phone
  AND m.created_at > NOW() - INTERVAL '1 day' * days;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Check expiring authorities
CREATE OR REPLACE FUNCTION check_expiring_authorities()
RETURNS TABLE(authority_id UUID, phone_number TEXT, role_label TEXT, days_left INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ap.id,
    ap.user_identifier,
    ap.role_label,
    EXTRACT(DAY FROM ap.valid_until - NOW())::INTEGER
  FROM authority_profiles ap
  WHERE ap.status = 'active'
  AND ap.valid_until > NOW()
  AND ap.valid_until < NOW() + INTERVAL '7 days'
  AND NOT EXISTS (
    SELECT 1 FROM authority_notifications an
    WHERE an.authority_id = ap.id
    AND an.notification_type = 'expiry_warning'
    AND DATE(an.sent_at) = CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_authority_notifications_authority ON authority_notifications(authority_id);
CREATE INDEX IF NOT EXISTS idx_authority_requests_phone ON authority_requests(phone_number);
CREATE INDEX IF NOT EXISTS idx_authority_requests_status ON authority_requests(status);
