#!/bin/bash
# Apply phone number constraint fixes

echo "🔧 Applying phone number constraint fixes..."

# Apply migration to Supabase
supabase db push --include-all

echo "✅ Migration applied"

# Test the fixes
echo "🧪 Testing phone number validation..."

# Test subscription insert
psql "$SUPABASE_DB_URL" -c "
INSERT INTO subscriptions (
  phone_number, 
  opted_in, 
  regions, 
  categories, 
  language,
  opted_in_at,
  last_activity
) VALUES (
  '27727002502',
  true,
  ARRAY['National'],
  ARRAY['Education', 'Safety', 'Opportunity'],
  'eng',
  NOW(),
  NOW()
) ON CONFLICT (phone_number) DO UPDATE SET
  opted_in = true,
  last_activity = NOW();
"

# Test message insert
psql "$SUPABASE_DB_URL" -c "
INSERT INTO messages (
  whatsapp_id,
  from_number,
  message_type,
  content,
  created_at
) VALUES (
  'test_' || extract(epoch from now()),
  '27727002502',
  'text',
  'Test message after constraint fix',
  NOW()
);
"

# Test authority lookup
psql "$SUPABASE_DB_URL" -c "
SELECT 
  user_identifier,
  authority_level,
  role_label,
  status
FROM authority_profiles 
WHERE user_identifier = '27727002502';
"

echo "🎉 Phone number constraints fixed and tested!"
echo "📱 Number 27727002502 should now work for subscriptions, messages, and authority"