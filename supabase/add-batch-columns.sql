-- Add batch tracking columns to broadcasts table
ALTER TABLE broadcasts 
ADD COLUMN IF NOT EXISTS batches_total INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS batches_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_by TEXT;
