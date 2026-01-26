-- Backfill slugs for moments that don't have them
UPDATE moments 
SET slug = generate_moment_slug(title, id)
WHERE slug IS NULL;

-- Verify
SELECT id, title, slug FROM moments ORDER BY created_at DESC LIMIT 10;
