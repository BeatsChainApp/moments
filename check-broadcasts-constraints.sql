-- Check broadcasts table for phone_number references
SELECT 
    column_name,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'broadcasts'
AND column_default LIKE '%phone_number%';

-- Check constraints
SELECT 
    conname,
    pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'broadcasts'::regclass;
