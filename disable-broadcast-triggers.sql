-- Disable specific user triggers on broadcasts table
DROP TRIGGER IF EXISTS notify_broadcast_completed ON broadcasts;
DROP TRIGGER IF EXISTS check_quota_warning ON broadcasts;
