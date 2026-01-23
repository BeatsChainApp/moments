-- Add region column to authority_profiles table
ALTER TABLE authority_profiles 
ADD COLUMN IF NOT EXISTS region TEXT;

-- Add index for region filtering
CREATE INDEX IF NOT EXISTS idx_authority_profiles_region ON authority_profiles(region);

-- Add comment
COMMENT ON COLUMN authority_profiles.region IS 'Geographic region for authority scope (KZN, WC, GP, etc.)';
