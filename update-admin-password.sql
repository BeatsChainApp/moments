-- Update admin password to Proof321#Moments
-- Run in Supabase SQL Editor

UPDATE admin_users
SET password_hash = crypt('Proof321#Moments', gen_salt('bf'))
WHERE email = 'info@unamifoundation.org';

-- Verify
SELECT email, active FROM admin_users WHERE email = 'info@unamifoundation.org';
