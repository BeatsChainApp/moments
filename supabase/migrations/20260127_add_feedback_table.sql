-- Feedback table for capturing user responses without creating conversations
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  moment_id UUID REFERENCES moments(id) ON DELETE SET NULL,
  feedback_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL
);

-- Index for admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_reviewed ON feedback(reviewed);
CREATE INDEX IF NOT EXISTS idx_feedback_moment_id ON feedback(moment_id);

-- RLS policies
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feedback readable by admins" ON feedback
  FOR SELECT USING (true);

CREATE POLICY "Feedback insertable by anyone" ON feedback
  FOR INSERT WITH CHECK (true);
