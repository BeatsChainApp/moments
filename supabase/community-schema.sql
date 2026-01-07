-- Add source tracking to moments table
ALTER TABLE moments ADD COLUMN IF NOT EXISTS source_message_id UUID REFERENCES messages(id);
ALTER TABLE moments ADD COLUMN IF NOT EXISTS content_source TEXT DEFAULT 'admin';
ALTER TABLE moments ADD COLUMN IF NOT EXISTS raw_content TEXT;
ALTER TABLE moments ADD COLUMN IF NOT EXISTS urgency_level TEXT DEFAULT 'low';
ALTER TABLE moments ADD COLUMN IF NOT EXISTS broadcast_sent TIMESTAMPTZ;
ALTER TABLE moments ADD COLUMN IF NOT EXISTS digest_sent TIMESTAMPTZ;

-- Update existing moments to mark as admin-created
UPDATE moments SET content_source = 'admin' WHERE content_source IS NULL;

-- Add indexes for source queries
CREATE INDEX IF NOT EXISTS idx_moments_source ON moments(content_source);
CREATE INDEX IF NOT EXISTS idx_moments_source_message ON moments(source_message_id);
CREATE INDEX IF NOT EXISTS idx_moments_urgency ON moments(urgency_level);
CREATE INDEX IF NOT EXISTS idx_moments_broadcast_sent ON moments(broadcast_sent);

-- Add MCP moderation results table
CREATE TABLE IF NOT EXISTS mcp_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id),
  action TEXT NOT NULL, -- publish, censor, block
  confidence DECIMAL(3,2),
  cleaned_content TEXT,
  is_duplicate BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);