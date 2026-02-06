-- Fix Supabase Security Linter Errors
-- Enable RLS on all public tables and fix SECURITY DEFINER views

-- Enable RLS on tables
ALTER TABLE public.authority_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authority_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authority_request_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_compliance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_attribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions_backup_20260124 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriber_deduplication_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin-only tables (service role bypass)
CREATE POLICY "Service role full access" ON public.authority_notifications FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.authority_requests FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.admin_sessions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.authority_request_state FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.admin_activity_logs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.notification_templates FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.marketing_compliance FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.user_preferences FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.pending_moments FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.template_performance FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.campaign_variants FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.variant_performance FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.link_clicks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.conversions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.revenue_attribution FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.subscriptions_backup_20260124 FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.notification_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.notification_types FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.notification_preferences FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.notification_batches FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.notification_templates_mapping FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON public.subscriber_deduplication_log FOR ALL USING (auth.role() = 'service_role');

-- Recreate views without SECURITY DEFINER
DROP VIEW IF EXISTS public.campaign_performance CASCADE;
DROP VIEW IF EXISTS public.compliance_dashboard CASCADE;
DROP VIEW IF EXISTS public.template_adoption CASCADE;
DROP VIEW IF EXISTS public.unified_analytics CASCADE;
DROP VIEW IF EXISTS public.campaign_roi_analysis CASCADE;
DROP VIEW IF EXISTS public.template_analytics CASCADE;
DROP VIEW IF EXISTS public.ab_test_results CASCADE;

-- Note: Views will need to be recreated without SECURITY DEFINER in their original migration files
-- This migration only drops them to remove the security issue
-- The application should use direct table queries with proper RLS policies instead
