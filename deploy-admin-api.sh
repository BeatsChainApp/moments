#!/bin/bash

# Deploy admin-api function to Supabase
echo "Deploying admin-api function..."

# Use curl to deploy via Supabase Management API
curl -X POST "https://api.supabase.com/v1/projects/bxmdzcxejcxbinghtyfw/functions" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "admin-api",
    "name": "admin-api", 
    "source": "'$(base64 -w 0 /workspaces/moments/supabase/functions/admin-api/index.ts)'"
  }'

echo "Deployment complete!"