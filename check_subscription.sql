-- Check your subscription
SELECT phone_number, opted_in, regions, categories, paused_until, last_activity
FROM subscriptions 
WHERE phone_number IN ('+27727002502', '27727002502');

-- Check the broadcast that was sent
SELECT b.id, b.target_regions, b.recipient_count, b.status, b.created_at, m.title
FROM broadcasts b
JOIN moments m ON b.moment_id = m.id
WHERE m.title LIKE '%Looking for people%'
ORDER BY b.created_at DESC
LIMIT 1;
