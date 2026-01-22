-- Create admin user
INSERT INTO admin_users (email, name, password_hash, active)
VALUES ('info@unamifoundation.org', 'Unami Admin', 'temp_hash', true)
ON CONFLICT (email) DO NOTHING;

-- Create sample messages for moderation
INSERT INTO messages (whatsapp_id, from_number, content, message_type, created_at)
VALUES 
  ('wamid_test_' || gen_random_uuid()::text, '+27658295041', 'Test message 1', 'text', NOW() - INTERVAL '1 hour'),
  ('wamid_test_' || gen_random_uuid()::text, '+27727002502', 'Test message 2', 'text', NOW() - INTERVAL '2 hours')
ON CONFLICT DO NOTHING;

-- Create sample authority profile
INSERT INTO authority_profiles (user_identifier, role_label, authority_level, scope, blast_radius, status)
VALUES ('+27658295041', 'Community Leader', 2, 'region', 100, 'active')
ON CONFLICT (user_identifier) DO NOTHING;

-- Create notification types if missing
INSERT INTO notification_types (type_code, display_name, default_enabled)
VALUES 
  ('moment_broadcast', 'Moment Broadcasts', true),
  ('emergency_alert', 'Emergency Alerts', true)
ON CONFLICT (type_code) DO NOTHING;
