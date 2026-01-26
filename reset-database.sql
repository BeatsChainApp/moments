-- Reset Database for User Testing
-- Keeps only admin user (info@unamifoundation.org / +27727002502)
-- Deletes all other data and resets sequences

BEGIN;

-- Delete all data except admin user
DELETE FROM broadcasts;
DELETE FROM moment_intents;
DELETE FROM moments;
DELETE FROM sponsors;
DELETE FROM subscriptions;
DELETE FROM flags;
DELETE FROM advisories;
DELETE FROM media;
DELETE FROM messages;
DELETE FROM authority_requests;
DELETE FROM authorities 
WHERE email != 'info@unamifoundation.org' 
  AND phone_number != '+27727002502';

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
SELECT id, email, phone_number, role, organization 
FROM authorities 
WHERE email = 'info@unamifoundation.org' 
   OR phone_number = '+27727002502';
