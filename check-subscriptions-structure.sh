#!/bin/bash

# Check subscriptions table structure
echo "🔍 Checking subscriptions table structure..."

if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Get table structure via Supabase REST API metadata
echo ""
echo "Attempting to query subscriptions table..."

# Try to get one record to see what columns exist
RESULT=$(curl -s "${SUPABASE_URL}/rest/v1/subscriptions?limit=1" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")

echo "Result: $RESULT"

# If empty array, table exists but is empty
if [ "$RESULT" = "[]" ]; then
  echo "✅ Table exists but is empty"
  echo ""
  echo "Trying to insert a test record to see what columns are required..."
  
  INSERT_RESULT=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/subscriptions" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d '{
      "phone_number": "+27658295041",
      "opted_in": true
    }')
  
  echo "Insert result: $INSERT_RESULT"
fi

echo ""
echo "=========================================="
echo "Run this SQL in Supabase SQL Editor to see actual structure:"
echo ""
echo "SELECT column_name, data_type, is_nullable"
echo "FROM information_schema.columns"
echo "WHERE table_name = 'subscriptions'"
echo "ORDER BY ordinal_position;"
