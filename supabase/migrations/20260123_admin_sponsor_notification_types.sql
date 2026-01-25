-- Add notification types for admin/sponsor notifications
INSERT INTO notification_types (type_code, type_name, description, default_channel, default_priority, active)
VALUES
  ('admin_flagged_content', 'Admin: Flagged Content', 'High-confidence content flagged for review', 'email', 4, true),
  ('admin_broadcast_completed', 'Admin: Broadcast Completed', 'Broadcast completed successfully', 'email', 2, true),
  ('admin_broadcast_failed', 'Admin: Broadcast Failed', 'Broadcast failed with errors', 'email', 4, true),
  ('admin_campaign_pending', 'Admin: Campaign Pending', 'New campaign needs review', 'email', 3, true),
  ('sponsor_campaign_approved', 'Sponsor: Campaign Approved', 'Campaign approved and ready', 'email', 3, true),
  ('sponsor_campaign_completed', 'Sponsor: Campaign Completed', 'Campaign completed with stats', 'email', 2, true),
  ('sponsor_moment_published', 'Sponsor: Moment Published', 'Sponsored moment is live', 'email', 2, true)
ON CONFLICT (type_code) DO NOTHING;
