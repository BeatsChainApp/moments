-- Fix admin_sessions table to prevent duplicate tokens
-- Run this in Supabase SQL Editor

-- 1. Check for duplicate tokens
SELECT token, COUNT(*) as count
FROM admin_sessions
GROUP BY token
HAVING COUNT(*) > 1;

-- 2. Delete old duplicate sessions (keep only the most recent)
DELETE FROM admin_sessions a
USING admin_sessions b
WHERE a.token = b.token 
  AND a.created_at < b.created_at;

-- 3. Add unique constraint on token (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'admin_sessions_token_key'
  ) THEN
    ALTER TABLE admin_sessions ADD CONSTRAINT admin_sessions_token_key UNIQUE (token);
  END IF;
END $$;

-- 4. Verify - should return no rows
SELECT token, COUNT(*) as count
FROM admin_sessions
GROUP BY token
HAVING COUNT(*) > 1;

-- 5. Check constraint was added
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'admin_sessions'::regclass;
