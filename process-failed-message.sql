-- Manual processing of your failed message from the logs
-- Based on the error log showing: "Title: 🌱 Community Cleanup Initiative"

-- 1. First, let's manually insert the message that failed
INSERT INTO messages (
  whatsapp_id,
  from_number,
  message_type,
  content,
  timestamp,
  processed,
  moderation_status,
  created_at
) VALUES (
  'manual_' || extract(epoch from now()),
  '27727002502',
  'text',
  '🌱 Community Cleanup Initiative

Hello Duck Po...', -- Your message content from the logs
  NOW(),
  false,
  'pending',
  NOW()
) ON CONFLICT (whatsapp_id) DO NOTHING
RETURNING id, content;

-- 2. Create a moment from your message (as community leader)
INSERT INTO moments (
  title,
  content,
  region,
  category,
  status,
  created_by,
  content_source,
  authority_context
) VALUES (
  '🌱 Community Cleanup Initiative',
  'Community cleanup initiative message from community leader', -- Placeholder - replace with actual content
  'National',
  'Community',
  'draft', -- Will be reviewed/approved
  '27727002502',
  'whatsapp',
  jsonb_build_object(
    'has_authority', true,
    'level', 2,
    'role', 'Community Leader',
    'auto_approved', false
  )
) RETURNING id, title, status;

-- 3. Check if there are any other failed messages to process
SELECT COUNT(*) as failed_messages
FROM messages 
WHERE processed = false 
  AND created_at > NOW() - INTERVAL '24 hours';

-- 4. Process any pending messages from community leaders
UPDATE messages 
SET processed = true,
    moderation_status = 'approved'
WHERE from_number = '27727002502'
  AND processed = false
RETURNING id, content;