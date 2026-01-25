#!/bin/bash
# Deploy Supabase notifications system
# Run from project root: ./deploy-notifications.sh

set -e

echo "🚀 Deploying Supabase Notifications System"
echo "=========================================="

# Migrations (run in order)
echo ""
echo "📦 Running migrations..."
supabase db push

# Edge Functions
echo ""
echo "⚡ Deploying edge functions..."

supabase functions deploy webhook
supabase functions deploy admin-api
supabase functions deploy authority-expiry-check
supabase functions deploy authority-notification
supabase functions deploy notification-retry
supabase functions deploy email-notification-processor

# Secrets (if not already set)
echo ""
echo "🔐 Setting secrets..."
echo "Note: Run these manually if needed:"
echo "  supabase secrets set RESEND_API_KEY=your_key"
echo "  supabase secrets set WHATSAPP_TOKEN=your_token"

# Cron jobs
echo ""
echo "⏰ Cron schedule (verify in Supabase dashboard):"
cat supabase/functions/_cron/schedule.txt

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Verify migrations in Supabase SQL Editor"
echo "2. Set RESEND_API_KEY secret if not already set"
echo "3. Test notifications via admin dashboard"
