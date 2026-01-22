#!/bin/bash
# Comprehensive broadcast system diagnostic

SUPABASE_URL="https://bxmdzcxejcxbinghtyfw.supabase.co"

echo "🔍 COMPREHENSIVE BROADCAST DIAGNOSTIC"
echo "======================================"
echo ""

# 1. Check database state
echo "1️⃣ DATABASE STATE"
echo "-------------------"
psql "$DATABASE_URL" <<SQL
-- Subscribers
SELECT 'Subscribers' as check_name, 
       COUNT(*) as total,
       COUNT(CASE WHEN opted_in THEN 1 END) as opted_in,
       COUNT(CASE WHEN phone_number LIKE '+%' THEN 1 END) as valid_format
FROM subscriptions;

-- RPC function exists
SELECT 'RPC Function' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_active_subscribers') 
            THEN 'EXISTS' ELSE 'MISSING' END as status,
       NULL::bigint as total,
       NULL::bigint as opted_in
FROM pg_proc LIMIT 1;

-- Test RPC
SELECT 'RPC Result' as check_name,
       'WORKS' as status,
       COUNT(*) as total,
       NULL::bigint as opted_in
FROM get_active_subscribers();

-- Broadcasts
SELECT 'Broadcasts' as check_name,
       status,
       COUNT(*) as total,
       SUM(success_count) as opted_in
FROM broadcasts
GROUP BY status;
SQL

echo ""
echo "2️⃣ EDGE FUNCTION TESTS"
echo "----------------------"

# Test admin-api
echo "Testing admin-api/analytics..."
curl -s -X GET "${SUPABASE_URL}/functions/v1/admin-api/analytics" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" | jq -r '.totalMoments // "ERROR"'

# Test broadcast-webhook
echo "Testing broadcast-webhook (should return error for empty payload)..."
curl -s -X POST "${SUPABASE_URL}/functions/v1/broadcast-webhook" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}' | jq -r '.error // "OK"'

echo ""
echo "3️⃣ ENVIRONMENT VARIABLES"
echo "------------------------"
echo "WHATSAPP_TOKEN: ${WHATSAPP_TOKEN:0:20}..."
echo "WHATSAPP_PHONE_ID: ${WHATSAPP_PHONE_ID}"
echo "SUPABASE_URL: ${SUPABASE_URL}"

echo ""
echo "4️⃣ CREATE TEST BROADCAST"
echo "-------------------------"

# Get a test moment
MOMENT_ID=$(psql "$DATABASE_URL" -t -c "SELECT id FROM moments WHERE status = 'broadcasted' ORDER BY created_at DESC LIMIT 1;")
MOMENT_ID=$(echo $MOMENT_ID | xargs)

if [ -z "$MOMENT_ID" ]; then
  echo "❌ No moments found - creating test moment..."
  MOMENT_ID=$(psql "$DATABASE_URL" -t -c "
    INSERT INTO moments (title, content, region, category, status, created_by, content_source)
    VALUES ('Test Broadcast', 'This is a test broadcast message', 'National', 'Community', 'draft', 'admin', 'admin')
    RETURNING id;
  ")
  MOMENT_ID=$(echo $MOMENT_ID | xargs)
fi

echo "Using moment: $MOMENT_ID"

# Trigger broadcast via admin-api
echo "Triggering broadcast..."
BROADCAST_RESULT=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/admin-api/moments/${MOMENT_ID}/broadcast" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json")

echo "$BROADCAST_RESULT" | jq '.'

BROADCAST_ID=$(echo "$BROADCAST_RESULT" | jq -r '.broadcast_id // empty')

if [ -n "$BROADCAST_ID" ]; then
  echo ""
  echo "Broadcast created: $BROADCAST_ID"
  echo "Waiting 5 seconds..."
  sleep 5
  
  echo ""
  echo "5️⃣ CHECK BROADCAST STATUS"
  echo "-------------------------"
  psql "$DATABASE_URL" <<SQL
  SELECT 
    id,
    status,
    recipient_count,
    success_count,
    failure_count,
    broadcast_started_at,
    broadcast_completed_at
  FROM broadcasts
  WHERE id = '$BROADCAST_ID';
SQL
else
  echo "❌ Failed to create broadcast"
fi

echo ""
echo "✅ DIAGNOSTIC COMPLETE"
