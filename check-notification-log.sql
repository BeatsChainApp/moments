-- Check if notification_log exists and its columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notification_log'
ORDER BY ordinal_position;
