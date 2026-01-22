-- Check ALL columns in broadcasts table
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable,
    is_generated
FROM information_schema.columns
WHERE table_name = 'broadcasts'
ORDER BY ordinal_position;
