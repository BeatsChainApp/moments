-- Investigation: Find Mock/Test Broadcast Data
-- Phase 1 Day 4: Data Cleanup

-- 1. Check for suspicious broadcasts (>95% success rate)
SELECT 
  id,
  moment_id,
  recipient_count,
  success_count,
  failure_count,
  (success_count::float / NULLIF(recipient_count, 0) * 100) as success_rate,
  created_at,
  status
FROM broadcasts
WHERE recipient_count > 0
  AND (success_count::float / NULLIF(recipient_count, 0)) > 0.95
ORDER BY created_at DESC;

-- 2. Check for exact match (455 recipients, 450 success, 5 failed)
SELECT * FROM broadcasts 
WHERE recipient_count = 455 
  AND success_count = 450 
  AND failure_count = 5;

-- 3. Check for test/seed patterns
SELECT * FROM broadcasts
WHERE status = 'completed'
  AND created_at < NOW() - INTERVAL '30 days'
  AND recipient_count IN (100, 200, 300, 400, 455, 500);

-- 4. Verify real broadcasts exist
SELECT COUNT(*) as total_broadcasts,
       COUNT(CASE WHEN recipient_count > 0 THEN 1 END) as with_recipients,
       AVG(success_count::float / NULLIF(recipient_count, 0) * 100) as avg_success_rate
FROM broadcasts;

-- 5. DELETE mock data (UNCOMMENT AFTER VERIFICATION)
-- DELETE FROM broadcasts 
-- WHERE recipient_count = 455 
--   AND success_count = 450 
--   AND failure_count = 5;

-- 6. Add validation constraint (prevent unrealistic success rates)
-- ALTER TABLE broadcasts 
-- ADD CONSTRAINT check_realistic_success_rate 
-- CHECK (
--   recipient_count = 0 OR 
--   (success_count::float / recipient_count) <= 1.0
-- );
