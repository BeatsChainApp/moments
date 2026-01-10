-- Add missing fields to sponsors table
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS brand_colors JSONB DEFAULT '{"primary": "#2563eb", "secondary": "#64748b"}';
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS brand_guidelines TEXT;
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'standard';

-- Make name unique if not already (correct syntax)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sponsors_name_unique') THEN
        ALTER TABLE sponsors ADD CONSTRAINT sponsors_name_unique UNIQUE (name);
    END IF;
END $$;