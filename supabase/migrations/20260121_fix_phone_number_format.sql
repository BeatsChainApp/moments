-- Fix phone number format in messages table
-- Add + prefix to phone numbers that don't have it

UPDATE messages 
SET from_number = '+' || from_number 
WHERE from_number NOT LIKE '+%'
  AND from_number ~ '^[0-9]+$';  -- Only update numeric phone numbers

-- Add check constraint to messages table to enforce + prefix (optional, commented out)
-- Uncomment if you want to enforce format for new messages only
-- ALTER TABLE messages 
-- ADD CONSTRAINT messages_phone_number_format 
-- CHECK (from_number ~ '^\\+[1-9]\\d{1,14}$');

-- Note: Constraint not added to allow flexibility for existing data
-- Webhook code now ensures new messages have + prefix
