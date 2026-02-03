-- Mark stuck broadcast as failed
UPDATE broadcasts 
SET 
  status = 'failed',
  broadcast_completed_at = NOW(),
  failure_count = recipient_count
WHERE id = '690fc76b-9890-4c1f-ac72-544d8be9f9ef';

-- Check result
SELECT id, status, recipient_count, success_count, failure_count 
FROM broadcasts 
WHERE id = '690fc76b-9890-4c1f-ac72-544d8be9f9ef';
