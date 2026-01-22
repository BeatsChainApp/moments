-- Temporarily disable RLS on broadcasts for testing
ALTER TABLE broadcasts DISABLE ROW LEVEL SECURITY;

-- Test broadcast, then re-enable:
-- ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
