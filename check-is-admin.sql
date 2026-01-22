-- Check is_admin function
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_name = 'is_admin'
AND routine_schema = 'public';
