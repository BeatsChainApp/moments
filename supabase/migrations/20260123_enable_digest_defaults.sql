-- Enable digest notifications for existing active subscribers
UPDATE subscriptions
SET 
  digest_enabled = true,
  digest_frequency = 'weekly'
WHERE 
  opted_in = true 
  AND digest_enabled = false;
