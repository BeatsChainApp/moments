#!/bin/bash

# Setup database schema for Moments app
echo "🗄️  Setting up Moments database schema..."
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

# Read the schema file
if [ ! -f "supabase/CLEAN_SCHEMA.sql" ]; then
  echo "❌ Schema file not found: supabase/CLEAN_SCHEMA.sql"
  exit 1
fi

echo "📄 Reading schema file..."
SCHEMA=$(cat supabase/CLEAN_SCHEMA.sql)

# Execute schema via Supabase SQL API
echo "🔧 Creating tables..."

# Note: Supabase doesn't have a direct SQL execution endpoint via REST API
# You need to run this in the Supabase SQL Editor or use the CLI

echo ""
echo "⚠️  MANUAL STEP REQUIRED:"
echo "=========================================="
echo "Please run the following SQL in your Supabase SQL Editor:"
echo ""
echo "1. Go to: ${SUPABASE_URL/https:\/\//https://app.supabase.com/project/}/sql"
echo "2. Copy and paste the contents of: supabase/CLEAN_SCHEMA.sql"
echo "3. Click 'Run' to execute"
echo ""
echo "Or use Supabase CLI:"
echo "  supabase db push"
echo ""
echo "=========================================="

# Check if tables exist
echo ""
echo "🔍 Checking existing tables..."

check_table() {
  TABLE_NAME=$1
  RESPONSE=$(curl -s "${SUPABASE_URL}/rest/v1/${TABLE_NAME}?limit=0" \
    -H "apikey: ${SUPABASE_SERVICE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
    -w "%{http_code}" \
    -o /dev/null)
  
  if [ "$RESPONSE" = "200" ]; then
    echo "  ✅ ${TABLE_NAME} exists"
    return 0
  else
    echo "  ❌ ${TABLE_NAME} missing (HTTP ${RESPONSE})"
    return 1
  fi
}

TABLES=("subscriptions" "moments" "broadcasts" "sponsors" "messages" "admin_users" "admin_sessions")
MISSING_COUNT=0

for table in "${TABLES[@]}"; do
  if ! check_table "$table"; then
    ((MISSING_COUNT++))
  fi
done

echo ""
if [ $MISSING_COUNT -eq 0 ]; then
  echo "✅ All required tables exist!"
else
  echo "⚠️  ${MISSING_COUNT} table(s) missing - please run the schema SQL"
fi

echo ""
echo "=========================================="
echo "Setup check complete"
