-- Check if authority RPC functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name LIKE '%authority%'
  AND routine_schema = 'public';
