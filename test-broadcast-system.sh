#!/bin/bash
# Test broadcast webhook functionality

SUPABASE_URL="https://bxmdzcxejcxbinghtyfw.supabase.co"
SERVICE_KEY="${SUPABASE_SERVICE_KEY}"

echo "🔍 Testing Broadcast System..."
echo ""

# 1. Test if broadcast-webhook function exists
echo "1️⃣ Checking broadcast-webhook function..."
curl -s -X POST "${SUPABASE_URL}/functions/v1/broadcast-webhook" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"test": true}' | jq '.'

echo ""
echo ""

# 2. Test get_active_subscribers RPC
echo "2️⃣ Testing get_active_subscribers RPC..."
curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/get_active_subscribers" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" | jq '. | length'

echo ""
echo ""

# 3. Check pending broadcasts
echo "3️⃣ Checking pending broadcasts..."
curl -s -X GET "${SUPABASE_URL}/rest/v1/broadcasts?status=eq.pending&select=id,moment_id,recipient_count,broadcast_started_at" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" | jq '.'

echo ""
echo ""

# 4. Check processing broadcasts
echo "4️⃣ Checking processing broadcasts..."
curl -s -X GET "${SUPABASE_URL}/rest/v1/broadcasts?status=eq.processing&select=id,moment_id,recipient_count,broadcast_started_at" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" | jq '.'

echo ""
echo "✅ Test complete"
