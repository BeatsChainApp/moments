-- Reset stuck broadcast to allow retry
UPDATE moments 
SET status = 'draft', broadcasted_at = NULL 
WHERE id = 'e5817693-073b-41c3-8865-f6a955cef188';

-- Delete notification logs first (foreign key constraint)
DELETE FROM notification_log WHERE broadcast_id = '690fc76b-9890-4c1f-ac72-544d8be9f9ef';

-- Then delete failed broadcast record
DELETE FROM broadcasts WHERE id = '690fc76b-9890-4c1f-ac72-544d8be9f9ef';
