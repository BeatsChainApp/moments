-- Check is_admin function
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'is_admin';
