#!/bin/bash
# Phase 1 Critical Fixes Deployment Script
# Run this after verifying all changes

set -e

echo "🚀 Deploying Phase 1 Critical Fixes..."
echo ""

# Step 1: Deploy MCP Advisory Function to Supabase
echo "📊 Step 1: Deploying MCP Advisory Function..."
echo "   → Run this SQL in Supabase SQL Editor:"
echo "   → File: supabase/mcp_advisory_function.sql"
echo ""
read -p "Press Enter after deploying MCP function..."

# Step 2: Deploy updated webhook function
echo "📡 Step 2: Deploying Webhook Function..."
cd supabase/functions/webhook
supabase functions deploy webhook --no-verify-jwt
cd ../../..
echo "✅ Webhook deployed"
echo ""

# Step 3: Deploy updated admin-api function
echo "🔧 Step 3: Deploying Admin API Function..."
cd supabase/functions/admin-api
supabase functions deploy admin-api --no-verify-jwt
cd ../../..
echo "✅ Admin API deployed"
echo ""

# Step 4: Verification
echo "🧪 Step 4: Running Verification Tests..."
echo ""

# Test MCP function
echo "Testing MCP Advisory Function..."
curl -X POST "https://bxmdzcxejcxbinghtyfw.supabase.co/rest/v1/rpc/mcp_advisory" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bWR6Y3hlamN4YmluZ2h0eWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNzMzOTYsImV4cCI6MjA4Mzc0OTM5Nn0.ccwWS_LPLjUrY8zqHD0Q7pTEamdN-QV0bv6f0B1uBUU" \
  -H "Content-Type: application/json" \
  -d '{"message_content":"This is a safe community message about local events"}' \
  | jq '.'
echo ""

echo "✅ Phase 1 Deployment Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Send test message via WhatsApp to verify command filtering"
echo "2. Check moderation panel - commands should NOT appear"
echo "3. Send safe message - should auto-approve (risk < 0.3)"
echo "4. Send image via WhatsApp - should download to Supabase Storage"
echo "5. Verify pagination works on moderation, subscribers, broadcasts"
echo ""
