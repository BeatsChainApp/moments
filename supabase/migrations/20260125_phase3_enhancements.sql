-- Phase 3: Admin Dashboard Enhancements
-- Full-text search, activity logs, and analytics support

-- 1. Full-text search for moments
CREATE INDEX IF NOT EXISTS idx_moments_search ON moments 
USING gin(to_tsvector('english', title || ' ' || COALESCE(content, '')));

-- 2. Admin activity logs
CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    admin_phone TEXT NOT NULL,
    action TEXT NOT NULL, -- 'create_moment', 'edit_moment', 'broadcast', 'delete_moment', 'create_sponsor', etc.
    entity_type TEXT NOT NULL, -- 'moment', 'sponsor', 'broadcast', etc.
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_logs_admin ON admin_activity_logs(admin_id, created_at DESC);
CREATE INDEX idx_admin_logs_entity ON admin_activity_logs(entity_type, entity_id);
CREATE INDEX idx_admin_logs_action ON admin_activity_logs(action, created_at DESC);

-- 3. Sponsor analytics materialized view (only if tables exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sponsors') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'moments') THEN
        
        -- Drop existing view if it exists
        DROP MATERIALIZED VIEW IF EXISTS sponsor_analytics;
        
        -- Create materialized view
        CREATE MATERIALIZED VIEW sponsor_analytics AS
        SELECT 
            s.id as sponsor_id,
            s.name as sponsor_name,
            COUNT(DISTINCT m.id) as total_moments,
            COUNT(DISTINCT b.id) as total_broadcasts,
            COALESCE(SUM(b.recipient_count), 0) as total_recipients,
            COALESCE(SUM(b.success_count), 0) as total_delivered,
            CASE 
                WHEN SUM(b.recipient_count) > 0 
                THEN ROUND((SUM(b.success_count)::NUMERIC / SUM(b.recipient_count) * 100), 1)
                ELSE 0 
            END as delivery_rate,
            MAX(b.broadcast_started_at) as last_broadcast_at,
            MIN(m.created_at) as first_moment_at
        FROM sponsors s
        LEFT JOIN moments m ON m.sponsor_id = s.id
        LEFT JOIN broadcasts b ON b.moment_id = m.id
        GROUP BY s.id, s.name;
        
        CREATE UNIQUE INDEX IF NOT EXISTS idx_sponsor_analytics_id ON sponsor_analytics(sponsor_id);
    END IF;
END $$;

-- 4. Function to refresh sponsor analytics
CREATE OR REPLACE FUNCTION refresh_sponsor_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY sponsor_analytics;
END;
$$ LANGUAGE plpgsql;

-- 5. Bulk operations support - add bulk_operation_id to track batch operations
ALTER TABLE moments ADD COLUMN IF NOT EXISTS bulk_operation_id UUID;
CREATE INDEX IF NOT EXISTS idx_moments_bulk_op ON moments(bulk_operation_id) WHERE bulk_operation_id IS NOT NULL;

-- Verification
SELECT 
    (SELECT COUNT(*) FROM admin_activity_logs) as activity_logs,
    (SELECT COUNT(*) FROM sponsor_analytics) as sponsor_analytics_rows,
    (SELECT COUNT(*) FROM pg_indexes WHERE indexname = 'idx_moments_search') as search_index_exists;
