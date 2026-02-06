-- Fix Remaining Supabase Security Linter Warnings
-- Set search_path on all functions using DO block to handle overloaded functions

DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT 
            n.nspname as schema_name,
            p.proname as function_name,
            pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname IN (
            'log_template_performance', 'process_auto_approval_queue', 'generate_moment_slug',
            'auto_generate_slug', 'refresh_sponsor_analytics', 'update_campaign_stats',
            'get_notification_preference', 'lookup_authority', 'log_authority_action',
            'should_send_notification', 'update_notification_preferences_timestamp', 'mcp_advisory',
            'distribute_ab_test_subscribers', 'track_click', 'track_click_simple', 'track_conversion',
            'update_comment_count', 'update_reply_count', 'track_conversion_simple',
            'calculate_ab_significance', 'notify_comment_approved', 'is_admin', 'trigger_mcp_analysis',
            'update_updated_at_column', 'process_scheduled_notifications', 'auto_approve_comment',
            'notify_authority_suspended', 'notify_new_subscriber', 'check_quota_warning',
            'log_notification', 'refresh_analytics', 'notify_moment_approved', 'notify_moment_rejected',
            'get_authority_analytics', 'send_emergency_alert', 'cancel_emergency_alert',
            'get_active_emergency_alerts', 'notify_admin_flagged_content', 'check_expiring_authorities',
            'refresh_top_moments', 'cleanup_old_data', 'calculate_compliance_score',
            'auto_calculate_compliance_score', 'lookup_campaign_authority', 'calculate_sponsor_performance',
            'generate_sponsor_invoice', 'get_active_subscribers', 'get_supabase_url', 'get_service_key',
            'notify_authority_verified', 'notify_moment_received', 'notify_broadcast_completed',
            'check_campaign_budget', 'notify_admin_broadcast_completed', 'notify_admin_broadcast_failed',
            'notify_admin_campaign_pending', 'notify_sponsor_campaign_approved', 'notify_sponsor_campaign_completed',
            'notify_sponsor_moment_published'
        )
    LOOP
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public, pg_temp', 
            func_record.schema_name, 
            func_record.function_name, 
            func_record.args
        );
    END LOOP;
END $$;

-- Revoke public access from materialized views (admin-only access)
REVOKE ALL ON public.sponsor_analytics FROM anon, authenticated;
REVOKE ALL ON public.top_moments FROM anon, authenticated;
GRANT SELECT ON public.sponsor_analytics TO service_role;
GRANT SELECT ON public.top_moments TO service_role;

-- Fix overly permissive RLS policies
DROP POLICY IF EXISTS "Admin can manage emergency alerts" ON public.emergency_alerts;
CREATE POLICY "Admin can manage emergency alerts" ON public.emergency_alerts 
  FOR ALL 
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Feedback insertable by anyone" ON public.feedback;
CREATE POLICY "Feedback insertable by anyone" ON public.feedback 
  FOR INSERT 
  WITH CHECK (phone_number IS NOT NULL AND feedback_text IS NOT NULL);
