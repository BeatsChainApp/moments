#!/bin/bash
# Quick Production Test Script

echo "🚀 Testing Moments App Production Deployment"
echo "=============================================="
echo ""

# Test 1: Health Check
echo "1️⃣ Testing Health Endpoint..."
HEALTH=$(curl -s https://moments.unamifoundation.org/health)
if echo "$HEALTH" | grep -q "healthy"; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    exit 1
fi
echo ""

# Test 2: Admin Dashboard
echo "2️⃣ Testing Admin Dashboard..."
ADMIN=$(curl -s -o /dev/null -w "%{http_code}" https://moments.unamifoundation.org/admin)
if [ "$ADMIN" = "200" ]; then
    echo "✅ Admin dashboard accessible"
else
    echo "❌ Admin dashboard returned $ADMIN"
    exit 1
fi
echo ""

# Test 3: Static Files
echo "3️⃣ Testing Static Files..."
CSS=$(curl -s -o /dev/null -w "%{http_code}" https://moments.unamifoundation.org/css/design-system.css)
if [ "$CSS" = "200" ]; then
    echo "✅ CSS files loading"
else
    echo "❌ CSS returned $CSS"
    exit 1
fi
echo ""

# Test 4: API Endpoints
echo "4️⃣ Testing API Endpoints..."
WEBHOOK=$(curl -s -o /dev/null -w "%{http_code}" "https://moments.unamifoundation.org/webhook?hub.mode=subscribe&hub.verify_token=test&hub.challenge=test")
if [ "$WEBHOOK" = "403" ] || [ "$WEBHOOK" = "200" ]; then
    echo "✅ Webhook endpoint responding"
else
    echo "❌ Webhook returned $WEBHOOK"
fi
echo ""

# Test 5: Public Endpoints
echo "5️⃣ Testing Public Endpoints..."
MOMENTS=$(curl -s https://moments.unamifoundation.org/public/moments)
if echo "$MOMENTS" | grep -q "moments"; then
    echo "✅ Public moments endpoint working"
else
    echo "⚠️ Public moments returned unexpected response"
fi
echo ""

echo "=============================================="
echo "✅ All critical tests passed!"
echo ""
echo "📋 Next Steps:"
echo "1. Add environment variables to Vercel"
echo "2. Test WhatsApp integration: Send 'START' to +27 65 829 5041"
echo "3. Login to admin: https://moments.unamifoundation.org/admin"
echo "4. Create test moment and broadcast"
echo ""
echo "🎯 System is READY for school test!"
