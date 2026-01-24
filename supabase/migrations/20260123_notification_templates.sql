-- Notification message templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  template_name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default templates
INSERT INTO notification_templates (template_key, template_name, message_template, variables) VALUES
('authority_granted', 'Authority Granted', '🎉 You''re now a {{role}}!

💡 Share what matters:
• Local opportunities
• Safety alerts
• Community events

Keep it short and clear.

📱 Send your message here to broadcast
📍 {{region}} • Valid until {{expiry_date}}

🌐 moments.unamifoundation.org', '["role", "region", "expiry_date"]'::jsonb),

('authority_suspended', 'Authority Suspended', '⏸️ Authority Suspended

Your {{role}} authority has been temporarily suspended.

Please contact support for more information.

🌐 moments.unamifoundation.org', '["role"]'::jsonb),

('authority_expiring', 'Authority Expiring', '{{urgency}} Authority Expiring Soon!

Your {{role}} authority expires in {{days_left}} day{{plural}}.

Contact your admin to extend your authority.

🌐 moments.unamifoundation.org', '["urgency", "role", "days_left", "plural"]'::jsonb)

ON CONFLICT (template_key) DO NOTHING;
