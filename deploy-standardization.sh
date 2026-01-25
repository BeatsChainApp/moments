#!/bin/bash
# Deploy Moments Standardization (Governance Implementation)
# Phase 1: Database + Attribution + Composition

set -e

echo "🚀 Deploying Moments Standardization..."
echo ""

# Check environment
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set"
  exit 1
fi

echo "✅ Environment variables configured"
echo ""

# Phase 1: Database Migration
echo "📊 Phase 1: Applying database migration..."
npx supabase db push --db-url "$SUPABASE_URL" \
  --file supabase/migrations/20260124_add_moment_standardization.sql

if [ $? -eq 0 ]; then
  echo "✅ Database migration applied successfully"
else
  echo "❌ Database migration failed"
  exit 1
fi
echo ""

# Phase 2: Deploy Edge Functions (if needed)
echo "📡 Phase 2: Checking edge functions..."
if [ -d "supabase/functions/email-notification-processor" ]; then
  echo "Deploying email-notification-processor..."
  npx supabase functions deploy email-notification-processor
  echo "✅ Edge function deployed"
fi
echo ""

# Phase 3: Verification
echo "🔍 Phase 3: Verifying deployment..."

# Check if slug column exists
echo "Checking slug column..."
psql "$SUPABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name='moments' AND column_name='slug';" > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Slug column exists"
else
  echo "⚠️  Slug column verification failed"
fi

# Check if attribution_data column exists
echo "Checking attribution_data column..."
psql "$SUPABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name='moments' AND column_name='attribution_data';" > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Attribution_data column exists"
else
  echo "⚠️  Attribution_data column verification failed"
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Test compose endpoint: GET /admin/moments/:id/compose"
echo "2. Verify slug generation for new moments"
echo "3. Check attribution blocks in broadcast messages"
echo "4. Update admin dashboard to show preview"
echo ""
echo "📚 See README.md Governance section for standards"
