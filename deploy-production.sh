#!/bin/bash
# Deploy production hardening and advanced features

echo "🚀 Deploying production hardening..."
supabase db execute --file supabase/production_hardening.sql

echo "🚀 Deploying advanced features..."
supabase db execute --file supabase/advanced_features.sql

echo "🚀 Redeploying admin-api function..."
supabase functions deploy admin-api

echo "✅ Deployment complete!"
echo ""
echo "📊 New features:"
echo "  - Rate limiting (100 req/min default)"
echo "  - Audit logging for all admin actions"
echo "  - Feature flags (check feature_flags table)"
echo "  - Error tracking and monitoring"
echo "  - Performance metrics (>1s responses logged)"
echo "  - Comment threads/replies"
echo "  - User profiles with reputation"
echo "  - Notifications system"
echo "  - Analytics events tracking"
echo "  - Moment engagement stats"
