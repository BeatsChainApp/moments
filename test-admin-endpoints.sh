#!/bin/bash

TOKEN=$(curl -s "https://bxmdzcxejcxbinghtyfw.supabase.co/functions/v1/admin-api" -X POST -H "Content-Type: application/json" -d '{"email":"info@unamifoundation.org","password":"Proof321#Moments"}' | jq -r '.token')

echo "🔑 Token: ${TOKEN:0:30}..."
echo ""

echo "👥 Admin Users:"
curl -s "https://bxmdzcxejcxbinghtyfw.supabase.co/functions/v1/admin-api/admin-users" -H "Authorization: Bearer $TOKEN" | jq '.users | length'

echo "📨 Messages:"
curl -s "https://bxmdzcxejcxbinghtyfw.supabase.co/functions/v1/admin-api/moderation" -H "Authorization: Bearer $TOKEN" | jq '.flaggedMessages | length'

echo "🎯 Moments:"
curl -s "https://bxmdzcxejcxbinghtyfw.supabase.co/functions/v1/admin-api/moments" -H "Authorization: Bearer $TOKEN" | jq '.moments | length'

echo "👤 Authority:"
curl -s "https://bxmdzcxejcxbinghtyfw.supabase.co/functions/v1/admin-api/authority" -H "Authorization: Bearer $TOKEN" | jq '.authority_profiles | length'
