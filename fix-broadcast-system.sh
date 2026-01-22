#!/bin/bash
# One-command broadcast system fix

set -e

echo "🔧 Fixing Moments Broadcast System..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Run this from the moments/ directory"
  exit 1
fi

# Step 1: Fix phone numbers
echo "1️⃣ Fixing phone number formats..."
psql "$DATABASE_URL" -f supabase/fix-phone-numbers.sql

# Step 2: Deploy RPC function
echo "2️⃣ Deploying get_active_subscribers function..."
psql "$DATABASE_URL" -f supabase/create-get-subscribers-function.sql

# Step 3: Mark stuck broadcasts as failed
echo "3️⃣ Cleaning up stuck broadcasts..."
psql "$DATABASE_URL" <<SQL
UPDATE broadcasts
SET status = 'failed',
    failure_count = recipient_count,
    broadcast_completed_at = NOW()
WHERE status IN ('pending', 'processing')
  AND broadcast_started_at < NOW() - INTERVAL '10 minutes';
SQL

# Step 4: Redeploy edge functions
echo "4️⃣ Redeploying Supabase edge functions..."
cd supabase/functions
supabase functions deploy admin-api --no-verify-jwt
supabase functions deploy broadcast-webhook --no-verify-jwt
supabase functions deploy webhook --no-verify-jwt
cd ../..

# Step 5: Verify
echo "5️⃣ Verifying system health..."
psql "$DATABASE_URL" <<SQL
SELECT 
  'Subscribers' as metric,
  COUNT(*) as total,
  COUNT(CASE WHEN opted_in THEN 1 END) as active
FROM subscriptions
UNION ALL
SELECT 
  'Valid Phone Format',
  COUNT(*),
  COUNT(CASE WHEN phone_number LIKE '+%' THEN 1 END)
FROM subscriptions
UNION ALL
SELECT 
  'RPC Function',
  1,
  COUNT(*)
FROM get_active_subscribers();
SQL

echo ""
echo "✅ Fix complete!"
echo ""
echo "Next steps:"
echo "1. Go to admin dashboard: https://moments.unamifoundation.org/admin"
echo "2. Create a test moment"
echo "3. Click 'Broadcast Now'"
echo "4. Check if broadcast completes within 2 minutes"
echo ""
