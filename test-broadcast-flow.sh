#!/bin/bash

# Test broadcast flow for authority moments
# This tests the complete flow: moment creation -> approval -> broadcast

echo "🧪 Testing Authority Moment Broadcast Flow"
echo "=========================================="

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check required environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY"
  exit 1
fi

echo "✅ Environment variables loaded"
echo ""

# Step 1: Login to get auth token
echo "Step 1: Authenticating..."
LOGIN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/admin-api" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "info@unamifoundation.org",
    "password": "Proof321#"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Authenticated successfully"
echo ""

# Step 2: Create a test moment (authority-verified content)
echo "Step 2: Creating authority moment..."
MOMENT_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/admin-api/moments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Authority Moment",
    "content": "This is a test moment from an authority figure. It should be treated as verified content.",
    "region": "KZN",
    "category": "Safety",
    "content_source": "authority",
    "status": "approved"
  }')

MOMENT_ID=$(echo $MOMENT_RESPONSE | jq -r '.moment.id')

if [ "$MOMENT_ID" = "null" ] || [ -z "$MOMENT_ID" ]; then
  echo "❌ Moment creation failed"
  echo "$MOMENT_RESPONSE" | jq '.'
  exit 1
fi

echo "✅ Moment created: $MOMENT_ID"
echo ""

# Step 3: Check active subscribers
echo "Step 3: Checking active subscribers..."
SUBS_COUNT=$(curl -s "${SUPABASE_URL}/rest/v1/subscriptions?opted_in=eq.true&select=count" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" | jq -r '.[0].count')

echo "   Active subscribers: ${SUBS_COUNT:-0}"
echo ""

# Step 4: Broadcast the moment
echo "Step 4: Broadcasting moment..."
BROADCAST_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/admin-api/moments/${MOMENT_ID}/broadcast" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "$BROADCAST_RESPONSE" | jq '.'

# Check if broadcast was successful
BROADCAST_SUCCESS=$(echo $BROADCAST_RESPONSE | jq -r '.success')

if [ "$BROADCAST_SUCCESS" = "true" ]; then
  echo ""
  echo "✅ Broadcast initiated successfully!"
  BROADCAST_ID=$(echo $BROADCAST_RESPONSE | jq -r '.broadcast_id')
  echo "   Broadcast ID: $BROADCAST_ID"
  
  # Wait a moment for processing
  echo ""
  echo "Waiting 5 seconds for broadcast processing..."
  sleep 5
  
  # Check broadcast status
  echo ""
  echo "Step 5: Checking broadcast status..."
  BROADCAST_STATUS=$(curl -s "${SUPABASE_URL}/rest/v1/broadcasts?id=eq.${BROADCAST_ID}&select=*" \
    -H "apikey: $SUPABASE_SERVICE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" | jq '.[0]')
  
  echo "$BROADCAST_STATUS" | jq '.'
  
else
  echo ""
  echo "❌ Broadcast failed"
  ERROR_MSG=$(echo $BROADCAST_RESPONSE | jq -r '.error')
  ERROR_DETAILS=$(echo $BROADCAST_RESPONSE | jq -r '.details')
  echo "   Error: $ERROR_MSG"
  echo "   Details: $ERROR_DETAILS"
  exit 1
fi

echo ""
echo "=========================================="
echo "✅ Test completed successfully!"
