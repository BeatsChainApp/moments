#!/bin/bash
# Test broadcast after admin-api redeployment

echo "🧪 Testing Broadcast System After Fix"
echo "======================================"
echo ""

# 1. Login
echo "1️⃣ Login..."
TOKEN=$(curl -s -X POST "https://bxmdzcxejcxbinghtyfw.supabase.co/functions/v1/admin-api" \
  -H "Content-Type: application/json" \
  -d '{"email":"info@unamifoundation.org","password":"Proof321#Moments"}' | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi

echo "✅ Logged in: $TOKEN"
echo ""

# 2. Create moment
echo "2️⃣ Creating moment..."
MOMENT_ID=$(curl -s -X POST "https://bxmdzcxejcxbinghtyfw.supabase.co/functions/v1/admin-api/moments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"System Test","content":"Testing broadcast after fix","region":"National","category":"Community"}' | jq -r '.moment.id')

echo "✅ Moment: $MOMENT_ID"
echo ""

# 3. Broadcast
echo "3️⃣ Broadcasting..."
RESULT=$(curl -s -X POST "https://bxmdzcxejcxbinghtyfw.supabase.co/functions/v1/admin-api/moments/$MOMENT_ID/broadcast" \
  -H "Authorization: Bearer $TOKEN")

echo "$RESULT" | jq '.'

if echo "$RESULT" | jq -e '.broadcast_id' > /dev/null; then
  BROADCAST_ID=$(echo "$RESULT" | jq -r '.broadcast_id')
  echo ""
  echo "✅ Broadcast created: $BROADCAST_ID"
  echo ""
  echo "4️⃣ Waiting 10 seconds..."
  sleep 10
  
  echo ""
  echo "5️⃣ Checking status..."
  curl -s -X GET "https://bxmdzcxejcxbinghtyfw.supabase.co/rest/v1/broadcasts?id=eq.$BROADCAST_ID&select=status,recipient_count,success_count,failure_count" \
    -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bWR6Y3hlamN4YmluZ2h0eWZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE3MzM5NiwiZXhwIjoyMDgzNzQ5Mzk2fQ.rcm_AT1o0Wiazvy9Pl6kjKc5jogHQKZyTfOxEX8v3Iw" \
    -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bWR6Y3hlamN4YmluZ2h0eWZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE3MzM5NiwiZXhwIjoyMDgzNzQ5Mzk2fQ.rcm_AT1o0Wiazvy9Pl6kjKc5jogHQKZyTfOxEX8v3Iw" | jq '.[0]'
else
  echo ""
  echo "❌ Broadcast failed"
fi
