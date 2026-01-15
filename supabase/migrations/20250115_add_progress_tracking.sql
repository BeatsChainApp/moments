-- Add progress tracking fields to broadcasts table
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS batches_total INTEGER DEFAULT 0;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS batches_completed INTEGER DEFAULT 0;
ALTER TABLE broadcasts ADD COLUMN IF NOT EXISTS progress_percentage DECIMAL(5,2) DEFAULT 0;