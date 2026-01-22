-- Check for views referencing broadcasts
SELECT table_name, view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND (view_definition ILIKE '%broadcasts%' OR view_definition ILIKE '%phone_number%')
LIMIT 10;
