-- Fix Supabase Performance Warnings
-- 1. Optimize RLS policies with SELECT subqueries for auth.role()
-- 2. Drop duplicate indexes
-- 3. Note: Multiple permissive policies are intentional (admin + public access patterns)

-- Fix auth_rls_initplan warnings by wrapping auth.role() in SELECT
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop and recreate service role policies with optimized auth check
    FOR policy_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'authority_notifications', 'authority_requests', 'admin_sessions', 
            'authority_request_state', 'admin_activity_logs', 'notification_templates',
            'marketing_compliance', 'user_preferences', 'pending_moments',
            'template_performance', 'campaign_variants', 'variant_performance',
            'link_clicks', 'conversions', 'revenue_attribution',
            'subscriptions_backup_20260124', 'notification_log', 'notification_types',
            'notification_preferences', 'notification_batches', 'notification_templates_mapping',
            'subscriber_deduplication_log'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Service role full access" ON public.%I', policy_record.tablename);
        EXECUTE format('CREATE POLICY "Service role full access" ON public.%I FOR ALL USING ((SELECT auth.role()) = ''service_role'')', policy_record.tablename);
    END LOOP;
END $$;

-- Fix emergency_alerts policy
DROP POLICY IF EXISTS "Admin can manage emergency alerts" ON public.emergency_alerts;
CREATE POLICY "Admin can manage emergency alerts" ON public.emergency_alerts 
  FOR ALL 
  USING ((SELECT auth.role()) = 'service_role');

-- Drop duplicate indexes
DROP INDEX IF EXISTS public.idx_messages_moderation_status;
DROP INDEX IF EXISTS public.idx_notification_prefs_phone;

-- Drop duplicate constraint (keeps subscriptions_phone_unique, drops older subscriptions_phone_number_key)
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_phone_number_key;

-- Note: Multiple permissive policies (e.g., "Admin access" + "Public read") are intentional
-- They provide separate access paths for admin and public users
-- Combining them would require complex OR logic and reduce maintainability
