-- Check authority_context for latest moments
SELECT 
  id,
  title,
  slug,
  authority_context,
  created_at
FROM moments 
ORDER BY created_at DESC 
LIMIT 5;
