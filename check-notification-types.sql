-- Check notification_types table
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'notification_types'
) as table_exists;

-- If exists, check structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notification_types'
ORDER BY ordinal_position;

-- Check if type_code exists
SELECT type_code FROM notification_types LIMIT 5;
