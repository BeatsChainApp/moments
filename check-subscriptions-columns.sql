-- Check subscriptions table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subscriptions'
ORDER BY ordinal_position;
