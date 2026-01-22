-- Check triggers on broadcasts table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'broadcasts';

-- Check if there's a view or function referencing phone_number incorrectly
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_definition LIKE '%phone_number%'
AND routine_schema = 'public';
