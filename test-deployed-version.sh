#!/bin/bash

echo "🔍 Testing Deployed Admin-API Version"
echo "======================================"

# Login
TOKEN=$(curl -s "https://bxmdzcxejcxbinghtyfw.supabase.co/functions/v1/admin-api" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"info@unamifoundation.org","password":"Proof321#Moments"}' | jq -r '.token')

echo "Token: ${TOKEN:0:30}..."

# Check version endpoint
echo -e "\n📋 Version Info:"
curl -s "https://bxmdzcxejcxbinghtyfw.supabase.co/functions/v1/admin-api/debug-broadcast" \
  -H "Authorization: Bearer $TOKEN" | jq

# Test direct subscriptions query via REST API
echo -e "\n✅ Direct REST API Query (should work):"
curl -s "https://bxmdzcxejcxbinghtyfw.supabase.co/rest/v1/subscriptions?opted_in=eq.true&select=phone_number&limit=2" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bWR6Y3hlamN4YmluZ2h0eWZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE3MzM5NiwiZXhwIjoyMDgzNzQ5Mzk2fQ.rcm_AT1o0Wiazvy9Pl6kjKc5jogHQKZyTfOxEX8v3Iw" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bWR6Y3hlamN4YmluZ2h0eWZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE3MzM5NiwiZXhwIjoyMDgzNzQ5Mzk2fQ.rcm_AT1o0Wiazvy9Pl6kjKc5jogHQKZyTfOxEX8v3Iw" | jq

echo -e "\n🔧 Conclusion: If version shows 'uses_rpc: true', deployment didn't update"
