#!/bin/bash
echo "🧪 Testing MCP Advisory Function..."
echo ""

# Test 1: Safe message
echo "Test 1: Safe community message"
curl -X POST "https://bxmdzcxejcxbinghtyfw.supabase.co/rest/v1/rpc/mcp_advisory" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bWR6Y3hlamN4YmluZ2h0eWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNzMzOTYsImV4cCI6MjA4Mzc0OTM5Nn0.ccwWS_LPLjUrY8zqHD0Q7pTEamdN-QV0bv6f0B1uBUU" \
  -H "Content-Type: application/json" \
  -d '{"message_content":"Community meeting tomorrow at 3pm about local farming"}' 2>/dev/null | jq -r '.overall_confidence'
echo ""

# Test 2: Spam message
echo "Test 2: Spam message"
curl -X POST "https://bxmdzcxejcxbinghtyfw.supabase.co/rest/v1/rpc/mcp_advisory" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bWR6Y3hlamN4YmluZ2h0eWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNzMzOTYsImV4cCI6MjA4Mzc0OTM5Nn0.ccwWS_LPLjUrY8zqHD0Q7pTEamdN-QV0bv6f0B1uBUU" \
  -H "Content-Type: application/json" \
  -d '{"message_content":"Click here to win money now! Limited time offer!"}' 2>/dev/null | jq -r '.overall_confidence'
echo ""

# Test 3: Harmful message
echo "Test 3: Harmful message"
curl -X POST "https://bxmdzcxejcxbinghtyfw.supabase.co/rest/v1/rpc/mcp_advisory" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4bWR6Y3hlamN4YmluZ2h0eWZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNzMzOTYsImV4cCI6MjA4Mzc0OTM5Nn0.ccwWS_LPLjUrY8zqHD0Q7pTEamdN-QV0bv6f0B1uBUU" \
  -H "Content-Type: application/json" \
  -d '{"message_content":"I will kill you"}' 2>/dev/null | jq -r '.overall_confidence'
echo ""

echo "✅ MCP Function Tests Complete"
echo ""
echo "Expected Results:"
echo "  Safe message: < 0.3 (should auto-approve)"
echo "  Spam message: > 0.7 (needs review)"
echo "  Harmful message: > 0.8 (escalate)"
