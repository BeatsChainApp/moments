-- Add Missing Foreign Key Indexes (INFO level - performance optimization)
-- These indexes improve JOIN performance on foreign key columns

-- Admin and authority tables
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user_id ON public.admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_advisories_message_id ON public.advisories(message_id);
CREATE INDEX IF NOT EXISTS idx_authority_audit_log_actor_id ON public.authority_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_authority_profiles_created_by ON public.authority_profiles(created_by);
CREATE INDEX IF NOT EXISTS idx_authority_profiles_updated_by ON public.authority_profiles(updated_by);
CREATE INDEX IF NOT EXISTS idx_authority_request_state_request_id ON public.authority_request_state(request_id);
CREATE INDEX IF NOT EXISTS idx_authority_requests_reviewed_by ON public.authority_requests(reviewed_by);

-- Broadcast and campaign tables
CREATE INDEX IF NOT EXISTS idx_broadcasts_campaign_id ON public.broadcasts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_notification_type_id ON public.broadcasts(notification_type_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_sponsor_id ON public.campaigns(sponsor_id);

-- Conversion and tracking tables
CREATE INDEX IF NOT EXISTS idx_conversions_moment_id ON public.conversions(moment_id);
CREATE INDEX IF NOT EXISTS idx_revenue_attribution_sponsor_id ON public.revenue_attribution(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_revenue_attribution_variant_id ON public.revenue_attribution(variant_id);
CREATE INDEX IF NOT EXISTS idx_revenue_events_sponsor_id ON public.revenue_events(sponsor_id);

-- Feedback and media tables
CREATE INDEX IF NOT EXISTS idx_feedback_message_id ON public.feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_feedback_reviewed_by ON public.feedback(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_media_message_id ON public.media(message_id);
CREATE INDEX IF NOT EXISTS idx_media_moment_id ON public.media(moment_id);

-- Moderation and moments tables
CREATE INDEX IF NOT EXISTS idx_moderation_audit_moment_id ON public.moderation_audit(moment_id);
CREATE INDEX IF NOT EXISTS idx_moments_sponsor_id ON public.moments(sponsor_id);

-- Notification tables
CREATE INDEX IF NOT EXISTS idx_notification_batches_notification_type_id ON public.notification_batches(notification_type_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_moment_id ON public.notification_log(moment_id);

-- WhatsApp comments
CREATE INDEX IF NOT EXISTS idx_whatsapp_comments_comment_id ON public.whatsapp_comments(comment_id);
