-- Fix: Add authority user to subscriptions so they receive broadcasts
INSERT INTO subscriptions (phone_number, opted_in, created_at)
VALUES ('+27727002502', true, NOW())
ON CONFLICT (phone_number) DO UPDATE SET opted_in = true, updated_at = NOW();

-- Verify
SELECT phone_number, opted_in, created_at FROM subscriptions WHERE phone_number = '+27727002502';
