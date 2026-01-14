#!/bin/bash
# Final system optimization deployment

echo "🚀 Deploying system optimization..."
supabase db execute --file supabase/system_optimization.sql

echo "🚀 Deploying system-cleanup function..."
supabase functions deploy system-cleanup

echo "🚀 Running initial cleanup..."
curl -X POST "https://bxmdzcxejcxbinghtyfw.supabase.co/functions/v1/system-cleanup" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"

echo ""
echo "✅ System optimization complete!"
echo ""
echo "📊 Performance improvements:"
echo "  - 6 new indexes for faster queries"
echo "  - Materialized view for top moments"
echo "  - Auto-cleanup of old data (daily)"
echo "  - Database vacuum completed"
echo ""
echo "🔧 GitHub Actions workflows:"
echo "  - Analytics refresh: Every hour"
echo "  - System cleanup: Daily at 2 AM"
