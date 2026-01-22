-- Fix the malformed moment
UPDATE moments 
SET 
  title = '🌱 Community Cleanup Initiative',
  content = 'Hello Duck Ponds learners and staff!
This Saturday, we''re organizing a community cleanup around the school grounds.

Volunteers are welcome to join from 08:00 AM to 12:00 PM.

Bring gloves, a mask, and your school spirit!

Let''s make our environment cleaner and greener together.

#DuckPondsCares #CommunityFirst',
  pwa_link = 'https://moments.unamifoundation.org/m/' || id
WHERE id = '727784da-ce17-4ea2-a741-7805ae27bf99';

-- Update all moments without PWA links
UPDATE moments
SET pwa_link = 'https://moments.unamifoundation.org/m/' || id
WHERE pwa_link IS NULL;
