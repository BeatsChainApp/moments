-- Add phone number normalization to prevent future duplicates
-- The webhook should normalize all phone numbers to the same format

-- Migration to add phone normalization function
CREATE OR REPLACE FUNCTION normalize_phone_number(phone_text TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Remove all non-digits
  phone_text := regexp_replace(phone_text, '[^0-9]', '', 'g');
  
  -- Convert to standard SA format (27XXXXXXXXX)
  IF phone_text ~ '^0[0-9]{9}$' THEN
    -- Convert 0XXXXXXXXX to 27XXXXXXXXX
    RETURN '27' || substring(phone_text from 2);
  ELSIF phone_text ~ '^27[0-9]{9}$' THEN
    -- Already in correct format
    RETURN phone_text;
  ELSIF phone_text ~ '^[0-9]{9}$' THEN
    -- Add 27 prefix
    RETURN '27' || phone_text;
  ELSE
    -- Return as-is if doesn't match SA patterns
    RETURN phone_text;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update existing subscriptions to use normalized format
UPDATE subscriptions 
SET phone_number = normalize_phone_number(phone_number)
WHERE phone_number != normalize_phone_number(phone_number);

-- Update existing messages to use normalized format  
UPDATE messages 
SET from_number = normalize_phone_number(from_number)
WHERE from_number != normalize_phone_number(from_number);

-- Update authority profiles to use normalized format
UPDATE authority_profiles 
SET user_identifier = normalize_phone_number(user_identifier)
WHERE user_identifier != normalize_phone_number(user_identifier);

-- Remove any remaining duplicates after normalization
DELETE FROM subscriptions a USING subscriptions b 
WHERE a.id > b.id 
  AND a.phone_number = b.phone_number;

-- Verify no duplicates remain
SELECT phone_number, COUNT(*) 
FROM subscriptions 
GROUP BY phone_number 
HAVING COUNT(*) > 1;