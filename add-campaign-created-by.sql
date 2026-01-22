-- Add created_by column to campaigns table
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
