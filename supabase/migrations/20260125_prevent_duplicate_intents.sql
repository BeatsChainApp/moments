-- Prevent duplicate intent processing
-- Add unique constraint to ensure one pending intent per moment+channel

CREATE UNIQUE INDEX IF NOT EXISTS idx_moment_intents_unique_pending 
ON moment_intents(moment_id, channel) 
WHERE status = 'pending';

COMMENT ON INDEX idx_moment_intents_unique_pending IS 'Prevents duplicate pending intents for same moment+channel combination';
