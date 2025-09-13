-- =====================================================
-- PENDING MIGRATIONS TO APPLY
-- Run each section in order in Supabase SQL Editor
-- Check the status script first to see what's needed
-- =====================================================

-- =====================================================
-- 1. GOTEAMUP MIGRATION SYSTEM (if not exists)
-- =====================================================
-- Check first: SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'migration_jobs');
-- If FALSE, run the migration at: supabase/migrations/20250913152200_goteamup_migration_system.sql

-- =====================================================
-- 2. STAFF CALENDAR SYSTEM (if not exists)
-- =====================================================
-- Check first: SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_calendar_bookings');
-- If FALSE, run these migrations in order:
-- - supabase/migrations/20250913_staff_calendar_system.sql
-- - supabase/migrations/20250913_shared_staff_calendar.sql

-- =====================================================
-- 3. NUTRITION FIELDS FOR CLIENTS (if missing)
-- =====================================================
-- Check if all fields exist with the check_migrations_status.sql script
-- If any are missing, run:

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS height_cm INTEGER,
ADD COLUMN IF NOT EXISTS weight_kg DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS fitness_goal TEXT CHECK (fitness_goal IN ('lose_weight', 'maintain', 'gain_muscle', 'improve_fitness', 'athletic_performance')),
ADD COLUMN IF NOT EXISTS activity_level TEXT CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active')),
ADD COLUMN IF NOT EXISTS dietary_type TEXT CHECK (dietary_type IN ('balanced', 'vegetarian', 'vegan', 'keto', 'paleo', 'mediterranean', 'low_carb', 'high_protein')),
ADD COLUMN IF NOT EXISTS allergies TEXT[],
ADD COLUMN IF NOT EXISTS cooking_time TEXT CHECK (cooking_time IN ('minimal', 'moderate', 'extensive')),
ADD COLUMN IF NOT EXISTS meals_per_day INTEGER DEFAULT 3 CHECK (meals_per_day BETWEEN 2 AND 6),
ADD COLUMN IF NOT EXISTS target_calories INTEGER,
ADD COLUMN IF NOT EXISTS protein_grams INTEGER,
ADD COLUMN IF NOT EXISTS carbs_grams INTEGER,
ADD COLUMN IF NOT EXISTS fat_grams INTEGER,
ADD COLUMN IF NOT EXISTS bmr DECIMAL(7,2),
ADD COLUMN IF NOT EXISTS tdee DECIMAL(7,2);

-- =====================================================
-- 4. MESSAGING SYSTEM FIXES (if needed)
-- =====================================================
-- Check with status script first
-- These should already be applied but verify:
-- - supabase/migrations/20250919_in_app_messaging_unify.sql
-- - supabase/migrations/20250919_fix_messages_view_and_conversation.sql

-- =====================================================
-- 5. CREATE MIGRATIONS TRACKING TABLE (recommended)
-- =====================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
    filename TEXT PRIMARY KEY,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert records for migrations you've already applied
-- Example:
-- INSERT INTO schema_migrations (filename) VALUES 
-- ('20250913152200_goteamup_migration_system.sql'),
-- ('20250913_staff_calendar_system.sql')
-- ON CONFLICT DO NOTHING;

-- =====================================================
-- 6. QUICK FIX FOR STAFF CALENDAR VIEW (if needed)
-- =====================================================
-- If you're getting errors with staff calendar, run:
CREATE OR REPLACE VIEW staff_calendar_bookings_view AS
SELECT 
    scb.*,
    u.email as staff_email,
    COALESCE(sp.first_name || ' ' || sp.last_name, u.email) as staff_full_name,
    COALESCE(
        scb.color_hex,
        CASE scb.booking_type
            WHEN 'pt_session_121' THEN '#3B82F6'      -- Blue
            WHEN 'group_class' THEN '#10B981'         -- Green
            WHEN 'gym_floor_time' THEN '#F59E0B'      -- Amber
            WHEN 'staff_meeting' THEN '#EF4444'       -- Red
            WHEN 'consultation' THEN '#8B5CF6'        -- Purple
            WHEN 'equipment_maintenance' THEN '#6B7280' -- Gray
            WHEN 'facility_cleaning' THEN '#06B6D4'   -- Cyan
            WHEN 'private_event' THEN '#EC4899'       -- Pink
            WHEN 'break_time' THEN '#84CC16'          -- Lime
            WHEN 'training_session' THEN '#F97316'    -- Orange
            ELSE '#6B7280'                             -- Default Gray
        END
    ) as display_color,
    0 as confirmed_client_count
FROM staff_calendar_bookings scb
LEFT JOIN auth.users u ON scb.staff_id = u.id
LEFT JOIN staff_profiles sp ON scb.staff_id = sp.user_id;

-- =====================================================
-- NOTES:
-- 1. Run check_migrations_status.sql first to see what's needed
-- 2. Apply migrations one at a time
-- 3. Check for errors after each migration
-- 4. The GoTeamUp migration system is only needed if you plan to import data
-- 5. Staff calendar is only needed if you're using staff scheduling features
-- =====================================================