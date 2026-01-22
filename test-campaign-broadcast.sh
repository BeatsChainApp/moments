#!/bin/bash

TOKEN=$(curl -s "https://bxmdzcxejcxbinghtyfw.supabase.co/functions/v1/admin-api" -X POST -H "Content-Type: application/json" -d '{"email":"info@unamifoundation.org","password":"Proof321#Moments"}' | jq -r '.token')

echo "Testing campaign broadcast..."
curl -s "https://bxmdzcxejcxbinghtyfw.supabase.co/functions/v1/admin-api/campaigns/67f2c936-fa11-4812-b820-9a43fba88662/broadcast" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq
