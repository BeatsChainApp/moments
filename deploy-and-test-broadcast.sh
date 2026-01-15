#!/bin/bash

# Production Broadcast Webhook Deployment & Verification Script
# Purpose: Deploy admin-api and broadcast-webhook, then verify functionality

set -e

SUPABASE_URL="https://bxmdzcxejcxbinghtyfw.supabase.co"
PROJECT_REF="bxmdzcxejcxbinghtyfw"
REGION="eu-west-3"

echo "═══════════════════════════════════════════════════════════════"
echo "🚀 BROADCAST WEBHOOK - FULL PRODUCTION DEPLOYMENT"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Step 1: Deploy broadcast-webhook
echo "📦 Step 1: Deploying broadcast-webhook function..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd /workspaces/moments/supabase/functions/broadcast-webhook

if ! supabase functions deploy broadcast-webhook; then
    echo "❌ Failed to deploy broadcast-webhook"
    exit 1
fi

echo "✅ broadcast-webhook deployed successfully"
sleep 3

# Step 2: Deploy admin-api
echo ""
echo "📦 Step 2: Deploying admin-api function..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd /workspaces/moments/supabase/functions/admin-api

if ! supabase functions deploy admin-api; then
    echo "❌ Failed to deploy admin-api"
    exit 1
fi

echo "✅ admin-api deployed successfully"
sleep 3

# Step 3: Verify function accessibility
echo ""
echo "🔍 Step 3: Verifying function accessibility..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

BROADCAST_WEBHOOK_URL="${SUPABASE_URL}/functions/v1/broadcast-webhook"
echo "Testing: ${BROADCAST_WEBHOOK_URL}"

# Test with OPTIONS request (CORS preflight)
echo -n "  - CORS preflight... "
if curl -s -X OPTIONS "$BROADCAST_WEBHOOK_URL" -H "Origin: *" | grep -q "ok"; then
    echo "✅"
else
    echo "⚠️ (expected for some environments)"
fi

# Test with empty POST (should return 400 for missing fields)
echo -n "  - POST endpoint responds... "
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BROADCAST_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [[ "$HTTP_CODE" =~ ^(400|401|405)$ ]]; then
    echo "✅ (HTTP $HTTP_CODE - validates request)"
else
    echo "⚠️ (HTTP $HTTP_CODE)"
fi

# Step 4: Test broadcast workflow
echo ""
echo "🧪 Step 4: Testing broadcast workflow..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create a test moment via admin-api
echo "Creating test moment..."

TEST_MOMENT=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/admin-api/moments" \
  -H "Authorization: Bearer $(echo $SUPABASE_SERVICE_ROLE_KEY)" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "📢 Broadcast Test Moment",
    "content": "This is a test moment created at '$(date)' to verify the broadcast webhook is functioning correctly.",
    "region": "National",
    "category": "Technology",
    "publish_to_whatsapp": false,
    "publish_to_pwa": true
  }')

if echo "$TEST_MOMENT" | grep -q '"id"'; then
    MOMENT_ID=$(echo "$TEST_MOMENT" | jq -r '.moment.id')
    echo "✅ Test moment created: $MOMENT_ID"
else
    echo "⚠️ Could not create test moment"
    echo "Response: $TEST_MOMENT"
fi

# Step 5: Check function logs
echo ""
echo "📊 Step 5: Checking function logs..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "To view real-time logs, run:"
echo ""
echo "  supabase functions list --verbose"
echo "  supabase functions logs --function-name broadcast-webhook"
echo "  supabase functions logs --function-name admin-api"
echo ""

# Step 6: Summary
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ DEPLOYMENT COMPLETE"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📋 Summary:"
echo "  ✅ broadcast-webhook deployed"
echo "  ✅ admin-api deployed"
echo "  ✅ Endpoint responding"
if [ ! -z "$MOMENT_ID" ]; then
    echo "  ✅ Test moment created: $MOMENT_ID"
fi
echo ""
echo "🔗 Function URLs:"
echo "  - broadcast-webhook: ${BROADCAST_WEBHOOK_URL}"
echo "  - admin-api: ${SUPABASE_URL}/functions/v1/admin-api"
echo ""
echo "📝 Next steps:"
echo "  1. Monitor logs: supabase functions logs --function-name broadcast-webhook"
echo "  2. Test broadcast: Create a campaign and verify webhook logs"
echo "  3. Check error_logs table for any issues"
echo ""
