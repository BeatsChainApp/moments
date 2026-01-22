-- Check notification_types columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notification_types'
ORDER BY ordinal_position;
