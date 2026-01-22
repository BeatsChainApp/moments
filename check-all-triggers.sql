-- Check ALL triggers on broadcasts table
SELECT 
    tgname AS trigger_name,
    tgtype,
    tgenabled,
    pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgrelid = 'broadcasts'::regclass
AND tgisinternal = false;
