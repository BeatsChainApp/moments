-- Migration: Add Moment Standardization Support
-- Adds slug column and attribution metadata for governance compliance

-- Add slug column for canonical URLs
ALTER TABLE moments 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Add attribution metadata (flexible JSON for future extensions)
ALTER TABLE moments 
ADD COLUMN IF NOT EXISTS attribution_data JSONB DEFAULT '{}'::jsonb;

-- Create slug generation function
CREATE OR REPLACE FUNCTION generate_moment_slug(title TEXT, moment_id UUID)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
BEGIN
  -- Convert title to kebab-case
  base_slug := lower(regexp_replace(trim(title), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := regexp_replace(base_slug, '^-+|-+$', '', 'g');
  base_slug := substring(base_slug, 1, 60);
  
  -- Append short hash for uniqueness
  final_slug := base_slug || '-' || substring(moment_id::text, 1, 6);
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Backfill slugs for existing moments (idempotent)
UPDATE moments 
SET slug = generate_moment_slug(title, id)
WHERE slug IS NULL;

-- Create trigger to auto-generate slugs on insert
CREATE OR REPLACE FUNCTION auto_generate_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_moment_slug(NEW.title, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS moments_auto_slug ON moments;
CREATE TRIGGER moments_auto_slug
  BEFORE INSERT ON moments
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_slug();

-- Add index for slug lookups
CREATE INDEX IF NOT EXISTS idx_moments_slug ON moments(slug);

-- Add comment for documentation
COMMENT ON COLUMN moments.slug IS 'Human-readable URL slug derived from title (kebab-case)';
COMMENT ON COLUMN moments.attribution_data IS 'System-generated attribution metadata (role, trust level, sponsor info)';
