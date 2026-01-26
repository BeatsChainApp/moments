-- Add authority_context to moments table
ALTER TABLE moments ADD COLUMN IF NOT EXISTS authority_context JSONB;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_moments_authority_context ON moments USING GIN (authority_context);

-- Comment
COMMENT ON COLUMN moments.authority_context IS 'Stores authority profile data from the message creator for proper attribution in broadcasts';
