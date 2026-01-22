#!/bin/bash
# Test broadcast end-to-end

SUPABASE_URL="https://bxmdzcxejcxbinghtyfw.supabase.co"
SERVICE_KEY="$SUPABASE_SERVICE_KEY"

echo "🧪 Testing Broadcast System"
echo ""

# 1. Create test moment
echo "1️⃣ Creating test moment..."
MOMENT=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/admin-api/moments" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Broadcast",
    "content": "Testing broadcast system - ignore this message",
    "region": "National",
    "category": "Community",
    "publish_to_whatsapp": false
  }')

MOMENT_ID=$(echo "$MOMENT" | jq -r '.moment.id')
echo "Created moment: $MOMENT_ID"

# 2. Trigger broadcast
echo ""
echo "2️⃣ Triggering broadcast..."
BROADCAST=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/admin-api/moments/${MOMENT_ID}/broadcast" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json")

echo "$BROADCAST" | jq '.'
BROADCAST_ID=$(echo "$BROADCAST" | jq -r '.broadcast_id // empty')

if [ -z "$BROADCAST_ID" ]; then
  echo "❌ Broadcast creation failed"
  exit 1
fi

# 3. Wait and check status
echo ""
echo "3️⃣ Waiting 10 seconds for broadcast to complete..."
sleep 10

echo ""
echo "4️⃣ Checking broadcast status..."
psql "$DATABASE_URL" -c "
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
"

echo ""
echo "5️⃣ Checking Supabase logs..."
echo "Go to: https://supabase.com/dashboard/project/bxmdzcxejcxbinghtyfw/logs/edge-functions"
echo "Filter: broadcast-webhook"
echo ""
