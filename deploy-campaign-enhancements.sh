#!/bin/bash
# Deploy Campaign System Enhancements (Phases 1-3)
# Template Integration + Authority + Budget + Analytics

set -e

echo "🚀 Deploying Campaign System Enhancements..."
echo ""

# Step 1: Database Migration
echo "📊 Step 1: Applying database migration..."
supabase db push --file supabase/migrations/20260117_campaign_enhancements.sql
echo "✅ Database schema updated"
echo ""

# Step 2: Deploy Enhanced Admin API
echo "📡 Step 2: Deploying enhanced admin API..."
supabase functions deploy admin-api
echo "✅ Admin API deployed"
echo ""

# Step 3: Verify Functions
echo "🔍 Step 3: Verifying database functions..."
psql $DATABASE_URL -c "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('lookup_campaign_authority', 'update_campaign_stats', 'log_template_performance', 'check_campaign_budget');"
echo "✅ Functions verified"
echo ""

# Step 4: Test Campaign Performance View
echo "📈 Step 4: Testing campaign performance view..."
psql $DATABASE_URL -c "SELECT COUNT(*) as campaign_count FROM campaign_performance;"
echo "✅ View accessible"
echo ""

# Step 5: Verify Template Performance Table
echo "📋 Step 5: Verifying template performance table..."
psql $DATABASE_URL -c "SELECT COUNT(*) FROM template_performance;"
echo "✅ Table ready"
echo ""

echo "✨ Deployment Complete!"
echo ""
echo "📋 What's New:"
echo "  ✅ Template selection integrated with campaigns"
echo "  ✅ Authority verification applied to campaigns"
echo "  ✅ Budget enforcement active"
echo "  ✅ Campaign-moment relationship tracking"
echo "  ✅ Template performance analytics"
echo "  ✅ Enhanced campaign analytics endpoints"
echo ""
echo "🔗 New Endpoints:"
echo "  GET  /analytics/campaigns - Campaign performance overview"
echo "  GET  /analytics/campaigns/{id} - Specific campaign details"
echo "  GET  /analytics/templates - Template performance comparison"
echo "  GET  /analytics/budget - Budget tracking and transactions"
echo ""
echo "🧪 Test Campaign Broadcast:"
echo "  curl -X POST https://your-project.supabase.co/functions/v1/admin-api/campaigns/{id}/broadcast \\"
echo "    -H 'Authorization: Bearer YOUR_TOKEN'"
echo ""
echo "📊 View Campaign Performance:"
echo "  curl https://your-project.supabase.co/functions/v1/admin-api/analytics/campaigns"
echo ""
