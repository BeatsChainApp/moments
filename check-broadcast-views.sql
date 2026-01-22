-- Find views that reference broadcasts
SELECT 
    table_name,
    view_definition
FROM information_schema.views
WHERE view_definition LIKE '%broadcasts%'
AND table_schema = 'public';
