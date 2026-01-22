#!/bin/bash
SUPABASE_URL="https://bxmdzcxejcxbinghtyfw.supabase.co"
SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bWR6Y3hlamN4YmluZ2h0eWZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE3MzM5NiwiZXhwIjoyMDgzNzQ5Mzk2fQ.rcm_AT1o0Wiazvy9Pl6kjKc5jogHQKZyTfOxEX8v3Iw"

echo "🧪 BROADCAST TEST"
echo ""

echo "1️⃣ Check subscribers..."
curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/get_active_subscribers" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" | jq '. | length'

echo ""
echo "2️⃣ Create moment..."
MOMENT=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/admin-api/moments" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":"Test broadcast","region":"National","category":"Community"}')

MOMENT_ID=$(echo "$MOMENT" | jq -r '.moment.id')
echo "Moment: $MOMENT_ID"

echo ""
echo "3️⃣ Trigger broadcast..."
BROADCAST=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/admin-api/moments/${MOMENT_ID}/broadcast" \
  -H "Authorization: Bearer ${SERVICE_KEY}")

echo "$BROADCAST" | jq '.'
BROADCAST_ID=$(echo "$BROADCAST" | jq -r '.broadcast_id')

echo ""
echo "4️⃣ Wait 10 seconds..."
sleep 10

echo ""
echo "5️⃣ Check status..."
curl -s -X GET "${SUPABASE_URL}/rest/v1/broadcasts?id=eq.${BROADCAST_ID}&select=*" \
  -H "apikey: ${SERVICE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" | jq '.[0] | {status, recipient_count, success_count, failure_count}'
