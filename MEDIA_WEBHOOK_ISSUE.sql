-- Webhook needs code fix, not SQL migration
-- The issue is in supabase/functions/webhook/index.ts line 1009
-- Images without captions are skipped because content is empty

-- For now, images are being received but not processed
-- They're stored in messages table with message_type='image' but media_url=null

-- To verify images are being received:
SELECT id, from_number, message_type, content, media_url, created_at 
FROM messages 
WHERE message_type = 'image' 
ORDER BY created_at DESC 
LIMIT 5;
