#!/bin/bash

TOKEN=$(curl -s "https://bxmdzcxejcxbinghtyfw.supabase.co/functions/v1/admin-api" -X POST -H "Content-Type: application/json" -d '{"email":"info@unamifoundation.org","password":"Proof321#Moments"}' | jq -r '.token')

echo "🔑 Logged in"

# Create moment
MOMENT=$(curl -s "https://bxmdzcxejcxbinghtyfw.supabase.co/functions/v1/admin-api/moments" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "🎉 System Test Broadcast",
    "content": "Hello! This is a test broadcast from the Unami Foundation Moments system. All systems are operational and working perfectly. Thank you for being part of our community!",
    "region": "National",
    "category": "Community"
  }')

MOMENT_ID=$(echo $MOMENT | jq -r '.moment.id')
echo "✅ Moment created: $MOMENT_ID"

# Broadcast
echo "📡 Broadcasting to all subscribers..."
curl -s "https://bxmdzcxejcxbinghtyfw.supabase.co/functions/v1/admin-api/moments/$MOMENT_ID/broadcast" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" | jq

echo ""
echo "✅ Broadcast sent!"
