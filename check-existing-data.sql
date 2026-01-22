-- Check existing data
SELECT 'admin_users' as table_name, COUNT(*) as count FROM admin_users
UNION ALL
SELECT 'messages', COUNT(*) FROM messages
UNION ALL
SELECT 'authority_profiles', COUNT(*) FROM authority_profiles
UNION ALL
SELECT 'moments', COUNT(*) FROM moments
UNION ALL
SELECT 'broadcasts', COUNT(*) FROM broadcasts
UNION ALL
SELECT 'subscriptions', COUNT(*) FROM subscriptions;
