#!/bin/bash

echo "=== UNAMI MOMENTS SYSTEM VERIFICATION ==="
echo "Mapping README.md claims to actual implementation"
echo

# Core Components Verification
echo "🏗️ CORE COMPONENTS VERIFICATION"
echo "================================"

echo "1. WhatsApp Business API Integration:"
if [ -f "src/webhook.js" ]; then
    echo "   ✅ Webhook handler: src/webhook.js"
    grep -q "WHATSAPP_TOKEN" src/webhook.js && echo "   ✅ Token integration found" || echo "   ❌ Token integration missing"
else
    echo "   ❌ Webhook handler missing"
fi

echo "2. Supabase Integration:"
if [ -f "config/supabase.js" ]; then
    echo "   ✅ Supabase config: config/supabase.js"
else
    echo "   ❌ Supabase config missing"
fi

echo "3. MCP Advisory System:"
if [ -f "src/advisory.js" ]; then
    echo "   ✅ Advisory module: src/advisory.js"
    grep -q "mcp_advisory" src/advisory.js && echo "   ✅ Native function call found" || echo "   ❌ Native function missing"
else
    echo "   ❌ Advisory module missing"
fi

echo "4. Admin Dashboard:"
if [ -f "public/admin-dashboard.html" ]; then
    echo "   ✅ Admin PWA: public/admin-dashboard.html"
else
    echo "   ❌ Admin PWA missing"
fi

echo "5. n8n Workflows:"
if [ -d "n8n" ]; then
    echo "   ✅ n8n directory exists"
    ls n8n/*.json 2>/dev/null | wc -l | xargs echo "   📊 Workflow files:"
else
    echo "   ❌ n8n directory missing"
fi

echo
echo "📱 WHATSAPP INTEGRATION VERIFICATION"
echo "==================================="

echo "Message Flow Components:"
[ -f "src/webhook.js" ] && echo "   ✅ Webhook processing" || echo "   ❌ Webhook missing"
[ -f "src/broadcast.js" ] && echo "   ✅ Broadcast system" || echo "   ❌ Broadcast missing"
grep -r "START\|JOIN\|STOP" src/ --include="*.js" >/dev/null && echo "   ✅ User commands" || echo "   ❌ Commands missing"

echo
echo "🎛️ ADMIN DASHBOARD VERIFICATION"
echo "==============================="

echo "Dashboard Features:"
[ -f "public/admin-dashboard.html" ] && echo "   ✅ Main dashboard" || echo "   ❌ Dashboard missing"
[ -f "public/js/admin.js" ] && echo "   ✅ Admin JavaScript" || echo "   ❌ Admin JS missing"
[ -f "src/admin.js" ] && echo "   ✅ Admin API routes" || echo "   ❌ Admin API missing"

echo
echo "🗄️ DATABASE SCHEMA VERIFICATION"
echo "==============================="

echo "Migration Files:"
ls supabase/migrations/*.sql 2>/dev/null | wc -l | xargs echo "   📊 Migration count:"
[ -f "supabase/migrations/20250111_add_mcp_advisory_function.sql" ] && echo "   ✅ MCP function migration" || echo "   ❌ MCP migration missing"

echo
echo "🔧 API ENDPOINTS VERIFICATION"
echo "============================"

echo "Checking endpoint implementations:"
if [ -f "src/server.js" ]; then
    grep -q "/health" src/server.js && echo "   ✅ Health endpoint" || echo "   ❌ Health missing"
    grep -q "/webhook" src/server.js && echo "   ✅ Webhook endpoint" || echo "   ❌ Webhook missing"
    grep -q "/admin" src/server.js && echo "   ✅ Admin endpoints" || echo "   ❌ Admin missing"
else
    echo "   ❌ Server file missing"
fi

echo
echo "🚀 DEPLOYMENT VERIFICATION"
echo "========================="

echo "Deployment Files:"
[ -f "deploy-moments.sh" ] && echo "   ✅ Deploy script" || echo "   ❌ Deploy script missing"
[ -f "package.json" ] && echo "   ✅ Package config" || echo "   ❌ Package config missing"
[ -f ".env.example" ] && echo "   ✅ Environment template" || echo "   ❌ Env template missing"

echo
echo "🔒 SECURITY VERIFICATION"
echo "======================="

echo "Security Components:"
grep -r "WEBHOOK_VERIFY_TOKEN" . --include="*.js" >/dev/null && echo "   ✅ Webhook verification" || echo "   ❌ Webhook verification missing"
grep -r "HMAC" . --include="*.js" >/dev/null && echo "   ✅ HMAC security" || echo "   ❌ HMAC missing"

echo
echo "=== VERIFICATION COMPLETE ==="