-- Check broadcasts table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'broadcasts'
ORDER BY ordinal_position;
