-- MCP Advisory RPC Function for Supabase
-- This function provides content moderation analysis for incoming messages
-- Returns JSONB with harm_signals, spam_indicators, and urgency_level

CREATE OR REPLACE FUNCTION mcp_advisory(
  message_content TEXT,
  message_language TEXT DEFAULT 'eng',
  message_type TEXT DEFAULT 'text',
  from_number TEXT DEFAULT NULL,
  message_timestamp TIMESTAMPTZ DEFAULT NOW()
) RETURNS JSONB AS $$
DECLARE
  harm_confidence DECIMAL;
  spam_confidence DECIMAL;
  urgency TEXT;
  result JSONB;
  content_lower TEXT;
  content_length INT;
BEGIN
  content_lower := LOWER(message_content);
  content_length := LENGTH(message_content);
  
  -- Harm detection (violence, threats, illegal content)
  harm_confidence := CASE
    WHEN content_lower ~* '(kill|murder|attack|bomb|weapon|gun|knife|violence|assault|rape|suicide)' THEN 0.95
    WHEN content_lower ~* '(threat|harm|hurt|destroy|fight|beat|stab)' THEN 0.75
    WHEN content_lower ~* '(hate|racist|discrimination)' THEN 0.70
    ELSE 0.05
  END;
  
  -- Spam detection (scams, unsolicited commercial)
  spam_confidence := CASE
    WHEN content_length < 5 THEN 0.85
    WHEN content_lower ~* '(click here|buy now|limited time|act now|urgent|winner|prize|lottery|bitcoin|investment|forex|crypto)' THEN 0.90
    WHEN content_lower ~* '(whatsapp\.me|wa\.me|t\.me|bit\.ly)' AND content_lower ~* '(money|cash|earn|profit)' THEN 0.85
    WHEN content_lower ~* '(viagra|pills|medication|pharmacy)' THEN 0.95
    WHEN content_lower ~ '(\d{10,})' AND content_lower ~* '(bank|account|transfer|send money)' THEN 0.80
    WHEN content_length > 1000 THEN 0.60
    ELSE 0.10
  END;
  
  -- Urgency level
  urgency := CASE
    WHEN harm_confidence > 0.8 OR spam_confidence > 0.8 THEN 'urgent'
    WHEN harm_confidence > 0.6 OR spam_confidence > 0.6 THEN 'high'
    WHEN harm_confidence > 0.4 OR spam_confidence > 0.4 THEN 'medium'
    ELSE 'low'
  END;
  
  -- Build result
  result := jsonb_build_object(
    'harm_signals', jsonb_build_object(
      'confidence', harm_confidence,
      'detected', harm_confidence > 0.5,
      'type', CASE 
        WHEN harm_confidence > 0.5 THEN 'potential_harm'
        ELSE 'safe'
      END
    ),
    'spam_indicators', jsonb_build_object(
      'confidence', spam_confidence,
      'detected', spam_confidence > 0.5,
      'type', CASE
        WHEN spam_confidence > 0.5 THEN 'potential_spam'
        ELSE 'legitimate'
      END
    ),
    'urgency_level', urgency,
    'overall_confidence', GREATEST(harm_confidence, spam_confidence),
    'escalation_suggested', (harm_confidence > 0.7 OR spam_confidence > 0.7),
    'language', message_language,
    'analyzed_at', NOW()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated and service role
GRANT EXECUTE ON FUNCTION mcp_advisory TO authenticated, service_role, anon;

-- Test the function
-- SELECT mcp_advisory('This is a test message about community events');
-- SELECT mcp_advisory('Click here to win money now! Limited time offer!');
-- SELECT mcp_advisory('I will kill you');
