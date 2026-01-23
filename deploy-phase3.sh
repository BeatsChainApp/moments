#!/bin/bash
# Phase 3 Deployment Script

echo "🚀 Deploying Authority Phase 3..."

# 1. Deploy Edge Functions
echo "📦 Deploying edge functions..."
supabase functions deploy authority-expiry-check
supabase functions deploy authority-notification
supabase functions deploy admin-api

echo ""
echo "✅ Phase 3 Deployment Complete!"
echo ""
echo "⚠️  MANUAL STEPS REQUIRED:"
echo ""
echo "1. Apply Database Migration:"
echo "   - Go to Supabase Dashboard → SQL Editor"
echo "   - Copy contents of: supabase/migrations/20260123_authority_phase3.sql"
echo "   - Paste and run in SQL Editor"
echo ""
echo "2. Test WhatsApp Integration:"
echo "   - Create test authority in admin dashboard"
echo "   - Verify WhatsApp notification received"
echo "   - Send 'REQUEST AUTHORITY' to WhatsApp bot"
echo "   - Complete request flow"
echo ""
echo "3. Verify Cron Job:"
echo "   - Check GitHub Actions tab"
echo "   - Manually trigger 'Authority Expiry Check' workflow"
echo ""
