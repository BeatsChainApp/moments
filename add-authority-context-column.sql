-- Add missing authority_context column to broadcasts table
ALTER TABLE broadcasts 
ADD COLUMN IF NOT EXISTS authority_context JSONB;
