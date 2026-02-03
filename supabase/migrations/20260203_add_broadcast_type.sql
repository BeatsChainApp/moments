-- Add missing broadcast_type column to broadcasts table
ALTER TABLE broadcasts 
ADD COLUMN IF NOT EXISTS broadcast_type text DEFAULT 'manual';
