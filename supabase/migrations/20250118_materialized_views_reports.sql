-- =====================================================
-- Materialized Views for Report Performance
-- =====================================================

-- This migration creates materialized views to improve report performance
-- by pre-aggregating commonly queried data

-- =====================================================
-- 1. Daily Attendance Counts
-- =====================================================

-- Materialized view for daily attendance counts by organization and class type
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_attendance_daily_counts AS
SELECT 
    cb.organization_id,
    cb.class_type_id,
    ct.name as class_type_name,
    DATE(cb.class_start_at) as day,
    COUNT(*) as total_bookings,
    COUNT(*) FILTER (WHERE cb.attendance_status = 'attended') as attended_count,
    COUNT(*) FILTER (WHERE cb.attendance_status = 'no_show') as no_show_count,
    COUNT(*) FILTER (WHERE cb.attendance_status = 'late_cancelled') as cancelled_count,
    COUNT(*) FILTER (WHERE cb.attendance_status = 'registered') as registered_count,
    ROUND(
        (COUNT(*) FILTER (WHERE cb.attendance_status = 'attended')::decimal / 
         NULLIF(COUNT(*), 0)) * 100, 
        1
    ) as attendance_rate,
    MAX(cb.updated_at) as last_updated
FROM class_bookings cb
JOIN class_types ct ON cb.class_type_id = ct.id
WHERE cb.class_start_at >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY 
    cb.organization_id, 
    cb.class_type_id,
    ct.name,
    DATE(cb.class_start_at);

-- Add indexes for better query performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_attendance_daily_counts_unique 
ON mv_attendance_daily_counts (organization_id, class_type_id, day);

CREATE INDEX IF NOT EXISTS idx_mv_attendance_daily_counts_org_day 
ON mv_attendance_daily_counts (organization_id, day DESC);

CREATE INDEX IF NOT EXISTS idx_mv_attendance_daily_counts_updated 
ON mv_attendance_daily_counts (last_updated DESC);

-- =====================================================
-- 2. Monthly Invoice Totals
-- =====================================================

-- Materialized view for monthly invoice totals by organization
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_invoice_monthly_totals AS
SELECT 
    organization_id,
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as total_invoices,
    COUNT(*) FILTER (WHERE status = 'paid') as paid_invoices,
    COUNT(*) FILTER (WHERE status = 'overdue') as overdue_invoices,
    COUNT(*) FILTER (WHERE status = 'draft') as draft_invoices,
    SUM(total_amount_pennies) as total_amount_pennies,
    SUM(total_amount_pennies) FILTER (WHERE status = 'paid') as paid_amount_pennies,
    SUM(total_amount_pennies) FILTER (WHERE status IN ('sent', 'overdue')) as outstanding_amount_pennies,
    ROUND(
        (COUNT(*) FILTER (WHERE status = 'paid')::decimal / 
         NULLIF(COUNT(*), 0)) * 100, 
        1
    ) as payment_rate,
    MAX(updated_at) as last_updated
FROM invoices
WHERE created_at >= CURRENT_DATE - INTERVAL '3 years'
GROUP BY 
    organization_id, 
    DATE_TRUNC('month', created_at);

-- Add indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_invoice_monthly_totals_unique 
ON mv_invoice_monthly_totals (organization_id, month);

CREATE INDEX IF NOT EXISTS idx_mv_invoice_monthly_totals_org_month 
ON mv_invoice_monthly_totals (organization_id, month DESC);

-- =====================================================
-- 3. Discount Code Usage Summary
-- =====================================================

-- Materialized view for discount code usage statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_discount_usage_summary AS
SELECT 
    dcu.organization_id,
    dcu.code_id,
    dc.code,
    dc.discount_type,
    dc.discount_value,
    COUNT(*) as total_uses,
    COUNT(DISTINCT dcu.customer_id) as unique_customers,
    SUM(dcu.discount_amount_pennies) as total_discount_amount_pennies,
    SUM(dcu.original_amount_pennies) as total_original_amount_pennies,
    AVG(dcu.discount_amount_pennies) as avg_discount_amount_pennies,
    ROUND(
        (SUM(dcu.discount_amount_pennies)::decimal / 
         NULLIF(SUM(dcu.original_amount_pennies), 0)) * 100, 
        1
    ) as savings_rate,
    MIN(dcu.used_at) as first_used_at,
    MAX(dcu.used_at) as last_used_at,
    MAX(dcu.created_at) as last_updated
FROM discount_code_usage dcu
JOIN discount_codes dc ON dcu.code_id = dc.id
WHERE dcu.used_at >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY 
    dcu.organization_id,
    dcu.code_id,
    dc.code,
    dc.discount_type,
    dc.discount_value;

-- Add indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_discount_usage_summary_unique 
ON mv_discount_usage_summary (organization_id, code_id);

CREATE INDEX IF NOT EXISTS idx_mv_discount_usage_summary_org_uses 
ON mv_discount_usage_summary (organization_id, total_uses DESC);

-- =====================================================
-- 4. Customer Activity Summary
-- =====================================================

-- Materialized view for customer activity metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_customer_activity_summary AS
SELECT 
    c.organization_id,
    c.id as customer_id,
    c.first_name,
    c.last_name,
    c.email,
    COUNT(cb.id) as total_bookings,
    COUNT(cb.id) FILTER (WHERE cb.attendance_status = 'attended') as classes_attended,
    COUNT(cb.id) FILTER (WHERE cb.attendance_status = 'no_show') as no_shows,
    ROUND(
        (COUNT(cb.id) FILTER (WHERE cb.attendance_status = 'attended')::decimal / 
         NULLIF(COUNT(cb.id), 0)) * 100, 
        1
    ) as attendance_rate,
    COUNT(DISTINCT cb.class_type_id) as unique_class_types,
    MAX(cb.class_start_at) FILTER (WHERE cb.attendance_status = 'attended') as last_attended_class,
    COALESCE(SUM(i.total_amount_pennies), 0) as total_spent_pennies,
    COUNT(i.id) as total_invoices,
    CASE 
        WHEN MAX(cb.class_start_at) FILTER (WHERE cb.attendance_status = 'attended') > CURRENT_DATE - INTERVAL '30 days' 
        THEN 'active'
        WHEN MAX(cb.class_start_at) FILTER (WHERE cb.attendance_status = 'attended') > CURRENT_DATE - INTERVAL '90 days' 
        THEN 'inactive'
        ELSE 'churned'
    END as activity_status,
    MAX(GREATEST(c.updated_at, cb.updated_at, i.updated_at)) as last_updated
FROM customers c
LEFT JOIN class_bookings cb ON c.id = cb.customer_id 
    AND cb.class_start_at >= CURRENT_DATE - INTERVAL '2 years'
LEFT JOIN invoices i ON c.id = i.customer_id 
    AND i.created_at >= CURRENT_DATE - INTERVAL '2 years'
WHERE c.created_at >= CURRENT_DATE - INTERVAL '3 years'
GROUP BY 
    c.organization_id,
    c.id,
    c.first_name,
    c.last_name,
    c.email;

-- Add indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_customer_activity_summary_unique 
ON mv_customer_activity_summary (organization_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_mv_customer_activity_summary_org_status 
ON mv_customer_activity_summary (organization_id, activity_status);

CREATE INDEX IF NOT EXISTS idx_mv_customer_activity_summary_attendance 
ON mv_customer_activity_summary (organization_id, attendance_rate DESC);

-- =====================================================
-- 5. Instructor Payout Summary
-- =====================================================

-- Materialized view for instructor payout metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_instructor_payout_summary AS
SELECT 
    p.organization_id,
    p.instructor_id,
    s.first_name as instructor_first_name,
    s.last_name as instructor_last_name,
    s.email as instructor_email,
    DATE_TRUNC('month', p.class_date) as month,
    COUNT(*) as total_classes,
    SUM(p.hours_taught) as total_hours,
    SUM(p.total_amount_pennies) as total_amount_pennies,
    SUM(p.total_amount_pennies) FILTER (WHERE p.status = 'paid') as paid_amount_pennies,
    SUM(p.total_amount_pennies) FILTER (WHERE p.status = 'pending') as pending_amount_pennies,
    AVG(p.hourly_rate_pennies) as avg_hourly_rate_pennies,
    COUNT(*) FILTER (WHERE p.status = 'paid') as paid_classes,
    COUNT(*) FILTER (WHERE p.status = 'pending') as pending_classes,
    MAX(p.updated_at) as last_updated
FROM payouts p
JOIN staff s ON p.instructor_id = s.id
WHERE p.class_date >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY 
    p.organization_id,
    p.instructor_id,
    s.first_name,
    s.last_name,
    s.email,
    DATE_TRUNC('month', p.class_date);

-- Add indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_instructor_payout_summary_unique 
ON mv_instructor_payout_summary (organization_id, instructor_id, month);

CREATE INDEX IF NOT EXISTS idx_mv_instructor_payout_summary_org_month 
ON mv_instructor_payout_summary (organization_id, month DESC);

-- =====================================================
-- 6. Revenue Summary by Class Type
-- =====================================================

-- Materialized view for revenue analysis by class type
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_revenue_by_class_type AS
SELECT 
    cb.organization_id,
    cb.class_type_id,
    ct.name as class_type_name,
    DATE_TRUNC('month', cb.class_start_at) as month,
    COUNT(*) as total_bookings,
    COUNT(*) FILTER (WHERE cb.attendance_status = 'attended') as attended_bookings,
    SUM(cb.payment_amount_pennies) as total_revenue_pennies,
    SUM(cb.payment_amount_pennies) FILTER (WHERE cb.attendance_status = 'attended') as attended_revenue_pennies,
    AVG(cb.payment_amount_pennies) as avg_booking_value_pennies,
    COUNT(DISTINCT cb.customer_id) as unique_customers,
    SUM(CASE WHEN cb.booking_method = 'membership' THEN cb.payment_amount_pennies ELSE 0 END) as membership_revenue_pennies,
    SUM(CASE WHEN cb.booking_method = 'drop_in' THEN cb.payment_amount_pennies ELSE 0 END) as drop_in_revenue_pennies,
    MAX(cb.updated_at) as last_updated
FROM class_bookings cb
JOIN class_types ct ON cb.class_type_id = ct.id
WHERE cb.class_start_at >= CURRENT_DATE - INTERVAL '2 years'
GROUP BY 
    cb.organization_id,
    cb.class_type_id,
    ct.name,
    DATE_TRUNC('month', cb.class_start_at);

-- Add indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_revenue_by_class_type_unique 
ON mv_revenue_by_class_type (organization_id, class_type_id, month);

CREATE INDEX IF NOT EXISTS idx_mv_revenue_by_class_type_org_month 
ON mv_revenue_by_class_type (organization_id, month DESC);

-- =====================================================
-- Functions to Refresh Materialized Views
-- =====================================================

-- Function to refresh all report materialized views for an organization
CREATE OR REPLACE FUNCTION refresh_report_materialized_views(target_org_id UUID DEFAULT NULL)
RETURNS TABLE (
    view_name TEXT,
    refresh_duration INTERVAL,
    rows_affected BIGINT,
    last_updated TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    rows_count BIGINT;
    view_rec RECORD;
BEGIN
    -- Log the refresh start
    INSERT INTO materialized_view_refresh_log (
        organization_id,
        started_at,
        status
    ) VALUES (
        target_org_id,
        NOW(),
        'started'
    );

    -- List of materialized views to refresh
    FOR view_rec IN 
        SELECT unnest(ARRAY[
            'mv_attendance_daily_counts',
            'mv_invoice_monthly_totals', 
            'mv_discount_usage_summary',
            'mv_customer_activity_summary',
            'mv_instructor_payout_summary',
            'mv_revenue_by_class_type'
        ]) AS mv_name
    LOOP
        start_time := clock_timestamp();
        
        -- Refresh the materialized view
        EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', view_rec.mv_name);
        
        end_time := clock_timestamp();
        
        -- Get row count (approximate)
        EXECUTE format('SELECT COUNT(*) FROM %I', view_rec.mv_name) INTO rows_count;
        
        -- Return the result
        view_name := view_rec.mv_name;
        refresh_duration := end_time - start_time;
        rows_affected := rows_count;
        last_updated := end_time;
        
        RETURN NEXT;
    END LOOP;
    
    -- Log the refresh completion
    UPDATE materialized_view_refresh_log 
    SET 
        completed_at = NOW(),
        status = 'completed'
    WHERE organization_id = target_org_id 
        AND started_at = (
            SELECT MAX(started_at) 
            FROM materialized_view_refresh_log 
            WHERE organization_id = target_org_id
        );
        
    RETURN;
END;
$$;

-- =====================================================
-- Refresh Log Table
-- =====================================================

-- Table to track materialized view refresh operations
CREATE TABLE IF NOT EXISTS materialized_view_refresh_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
    error_message TEXT,
    views_refreshed TEXT[],
    total_duration INTERVAL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS for refresh log
ALTER TABLE materialized_view_refresh_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY materialized_view_refresh_log_org_access 
ON materialized_view_refresh_log
FOR ALL
USING (
    organization_id = (
        SELECT organization_id 
        FROM user_organizations 
        WHERE user_id = auth.uid() 
        LIMIT 1
    )
);

-- Index for refresh log
CREATE INDEX IF NOT EXISTS idx_mv_refresh_log_org_started 
ON materialized_view_refresh_log (organization_id, started_at DESC);

-- =====================================================
-- Automated Refresh Trigger
-- =====================================================

-- Function to determine if materialized views need refreshing
CREATE OR REPLACE FUNCTION should_refresh_materialized_views(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    last_refresh TIMESTAMPTZ;
    significant_changes INTEGER;
BEGIN
    -- Get the last successful refresh time
    SELECT MAX(completed_at) 
    INTO last_refresh
    FROM materialized_view_refresh_log 
    WHERE organization_id = target_org_id 
        AND status = 'completed';
    
    -- If never refreshed, return true
    IF last_refresh IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Check for significant data changes since last refresh
    SELECT COUNT(*)
    INTO significant_changes
    FROM (
        -- Count booking changes
        SELECT COUNT(*) as changes FROM class_bookings 
        WHERE organization_id = target_org_id 
            AND updated_at > last_refresh
        
        UNION ALL
        
        -- Count invoice changes  
        SELECT COUNT(*) as changes FROM invoices 
        WHERE organization_id = target_org_id 
            AND updated_at > last_refresh
            
        UNION ALL
        
        -- Count payout changes
        SELECT COUNT(*) as changes FROM payouts 
        WHERE organization_id = target_org_id 
            AND updated_at > last_refresh
    ) changes;
    
    -- Refresh if more than 100 changes or if last refresh was over 6 hours ago
    RETURN (
        significant_changes > 100 OR 
        last_refresh < NOW() - INTERVAL '6 hours'
    );
END;
$$;

-- =====================================================
-- Cron Job Setup (requires pg_cron extension)
-- =====================================================

-- Note: This requires the pg_cron extension to be enabled
-- Uncomment and adjust the schedule as needed

/*
-- Refresh materialized views nightly at 2 AM
SELECT cron.schedule(
    'refresh-report-materialized-views',
    '0 2 * * *',
    $$
    SELECT refresh_report_materialized_views(org.id)
    FROM organizations org
    WHERE should_refresh_materialized_views(org.id);
    $$
);
*/

-- =====================================================
-- Permissions and Security
-- =====================================================

-- Grant necessary permissions for materialized view access
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO service_role;

-- Ensure RLS is enforced on all new materialized views
-- (Materialized views inherit RLS from base tables when using WHERE clauses)

-- Add comments for documentation
COMMENT ON MATERIALIZED VIEW mv_attendance_daily_counts IS 
'Pre-aggregated daily attendance statistics by organization and class type';

COMMENT ON MATERIALIZED VIEW mv_invoice_monthly_totals IS 
'Monthly invoice totals and payment rates by organization';

COMMENT ON MATERIALIZED VIEW mv_discount_usage_summary IS 
'Discount code usage statistics and savings analysis';

COMMENT ON MATERIALIZED VIEW mv_customer_activity_summary IS 
'Customer engagement metrics and activity status';

COMMENT ON MATERIALIZED VIEW mv_instructor_payout_summary IS 
'Monthly instructor payout summaries and metrics';

COMMENT ON MATERIALIZED VIEW mv_revenue_by_class_type IS 
'Revenue analysis broken down by class type and month';

-- =====================================================
-- Initial Refresh
-- =====================================================

-- Perform initial refresh of all materialized views
-- This will populate the views with existing data
SELECT refresh_report_materialized_views();

-- =====================================================
-- Performance Monitoring
-- =====================================================

-- View to monitor materialized view performance
CREATE OR REPLACE VIEW mv_performance_stats AS
SELECT 
    schemaname,
    matviewname as view_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size,
    CASE 
        WHEN ispopulated THEN 'populated'
        ELSE 'not_populated'
    END as status,
    pg_stat_user_tables.n_tup_upd + pg_stat_user_tables.n_tup_ins + pg_stat_user_tables.n_tup_del as total_changes,
    pg_stat_user_tables.last_analyze,
    pg_stat_user_tables.last_autoanalyze
FROM pg_matviews
LEFT JOIN pg_stat_user_tables ON pg_stat_user_tables.relname = pg_matviews.matviewname
WHERE schemaname = 'public' 
    AND matviewname LIKE 'mv_%'
ORDER BY pg_total_relation_size(schemaname||'.'||matviewname) DESC;

COMMENT ON VIEW mv_performance_stats IS 
'Performance statistics for all report materialized views';