-- Add MCP Advisory RPC Function
-- This function provides native content moderation and risk assessment

CREATE OR REPLACE FUNCTION mcp_advisory(
  message_content TEXT,
  message_language TEXT DEFAULT 'eng',
  message_type TEXT DEFAULT 'text',
  from_number TEXT DEFAULT '',
  message_timestamp TIMESTAMPTZ DEFAULT NOW()
) RETURNS JSONB AS $$
DECLARE
  harm_confidence DECIMAL := 0.0;
  spam_confidence DECIMAL := 0.0;
  urgency_level TEXT := 'low';
  result JSONB;
BEGIN
  -- Initialize default values
  harm_confidence := 0.1;
  spam_confidence := 0.1;
  urgency_level := 'low';
  
  -- Basic harm detection (keyword-based)
  IF message_content ~* '(kill|murder|attack|bomb|weapon|violence|threat|hurt|harm)' THEN
    harm_confidence := 0.9;
    urgency_level := 'high';
  ELSIF message_content ~* '(scam|fraud|money|bitcoin|investment|loan|get rich|easy money)' THEN
    harm_confidence := 0.7;
    urgency_level := 'medium';
  ELSIF message_content ~* '(hate|racist|stupid|idiot)' THEN
    harm_confidence := 0.5;
    urgency_level := 'medium';
  END IF;
  
  -- Spam detection
  IF length(message_content) < 5 THEN
    spam_confidence := 0.8;
  ELSIF message_content ~* '(click here|buy now|limited time|act fast|urgent|winner|congratulations)' THEN
    spam_confidence := 0.9;
  ELSIF message_content ~ '(.)\1{4,}' THEN -- Repeated characters
    spam_confidence := 0.6;
  ELSIF message_content ~* '(http|www\.|\.com|\.co\.za)' AND message_content !~* 'moments\.unamifoundation\.org' THEN
    spam_confidence := 0.4;
  END IF;
  
  -- Adjust for message type
  IF message_type IN ('image', 'video', 'audio') THEN
    -- Media messages are generally safer
    harm_confidence := harm_confidence * 0.7;
    spam_confidence := spam_confidence * 0.8;
  END IF;
  
  -- Build result JSON
  result := jsonb_build_object(
    'language_confidence', 0.8,
    'urgency_level', urgency_level,
    'harm_signals', jsonb_build_object(
      'detected', harm_confidence > 0.5,
      'type', CASE 
        WHEN harm_confidence > 0.8 THEN 'violence'
        WHEN harm_confidence > 0.6 THEN 'scam'
        WHEN harm_confidence > 0.4 THEN 'harassment'
        ELSE 'none'
      END,
      'confidence', harm_confidence,
      'context', 'Automated keyword-based detection'
    ),
    'spam_indicators', jsonb_build_object(
      'detected', spam_confidence > 0.5,
      'patterns', CASE 
        WHEN spam_confidence > 0.8 THEN ARRAY['short_message', 'promotional_language']
        WHEN spam_confidence > 0.5 THEN ARRAY['promotional_language']
        ELSE ARRAY[]::TEXT[]
      END,
      'confidence', spam_confidence
    ),
    'escalation_suggested', (harm_confidence > 0.7 OR spam_confidence > 0.8),
    'overall_confidence', GREATEST(harm_confidence, spam_confidence),
    'notes', 'Native Supabase MCP analysis - ' || message_type || ' message'
  );
  
  -- Store advisory in database
  INSERT INTO advisories (
    advisory_type,
    confidence,
    harm_signals,
    spam_indicators,
    urgency_level,
    escalation_suggested,
    details
  ) VALUES (
    'content_quality',
    GREATEST(harm_confidence, spam_confidence),
    result->'harm_signals',
    result->'spam_indicators',
    urgency_level,
    (harm_confidence > 0.7 OR spam_confidence > 0.8),
    result
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION mcp_advisory TO authenticated, anon, service_role;

-- Test the function
SELECT mcp_advisory('Hello, this is a test message', 'eng', 'text', '+27123456789');