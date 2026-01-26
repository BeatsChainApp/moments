-- Reset Database for User Testing
-- Keeps only admin user (info@unamifoundation.org / +27727002502)
-- Deletes all other data and resets sequences

BEGIN;

-- Delete all data except admin user (in correct order to respect foreign keys)
DELETE FROM notification_log;
DELETE FROM broadcast_batches;
DELETE FROM broadcasts;
DELETE FROM moment_intents;
DELETE FROM moderation_audit;
DELETE FROM advisories;
DELETE FROM media;
DELETE FROM moments;
DELETE FROM campaigns;
DELETE FROM messages;
DELETE FROM subscriptions;
DELETE FROM sponsors WHERE name != 'unami-foundation';
DELETE FROM admin_sessions;
DELETE FROM admin_roles WHERE user_id NOT IN (SELECT id FROM admin_users WHERE email = 'info@unamifoundation.org');
DELETE FROM admin_users WHERE email != 'info@unamifoundation.org';

-- Reset sequences to 1
ALTER SEQUENCE IF EXISTS messages_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS media_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS advisories_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS flags_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS moments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS sponsors_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS broadcasts_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS subscriptions_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS moment_intents_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS authority_requests_id_seq RESTART WITH 1;

COMMIT;

-- Verify admin user still exists
SELECT id, email, name, active
FROM admin_users 
WHERE email = 'info@unamifoundation.org';
