#!/bin/bash

echo "🔍 Testing Subscribers Query"
echo "============================"

TOKEN=$(curl -s "https://bxmdzcxejcxbinghtyfw.supabase.co/functions/v1/admin-api" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"info@unamifoundation.org","password":"Proof321#Moments"}' | jq -r '.token')

echo "Token: ${TOKEN:0:30}..."

# Test subscribers endpoint
echo -e "\n📊 Subscribers endpoint:"
curl -s "https://bxmdzcxejcxbinghtyfw.supabase.co/functions/v1/admin-api/subscribers?limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq '.subscribers[0:2]'

echo -e "\n✅ Direct query test complete"
