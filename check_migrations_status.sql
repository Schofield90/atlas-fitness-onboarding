-- =====================================================
-- Migration Status Check Script
-- Run this in Supabase SQL Editor to check what migrations are needed
-- =====================================================

-- Check for GoTeamUp Migration Tables
SELECT 'GoTeamUp Migration Tables' as category, 
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'migration_jobs') as migration_jobs,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'migration_files') as migration_files,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'migration_records') as migration_records,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'migration_field_mappings') as field_mappings,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'migration_conflicts') as conflicts,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'migration_logs') as logs;

-- Check for Staff Calendar Tables
SELECT 'Staff Calendar System' as category,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_calendar_bookings') as staff_bookings,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_profiles') as staff_profiles,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_availability') as staff_availability,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'staff_breaks') as staff_breaks,
       EXISTS(SELECT 1 FROM pg_views WHERE viewname = 'staff_calendar_bookings_view') as calendar_view;

-- Check for Nutrition Fields in Clients Table
SELECT 'Nutrition Fields in Clients' as category,
       EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'height_cm') as height_cm,
       EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'weight_kg') as weight_kg,
       EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'fitness_goal') as fitness_goal,
       EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'activity_level') as activity_level,
       EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'target_calories') as target_calories,
       EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'bmr') as bmr,
       EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'tdee') as tdee;

-- Check for Messaging System Tables
SELECT 'Messaging System' as category,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') as messages_table,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') as conversations_table,
       EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'conversation_id') as has_conversation_id,
       EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_type') as has_sender_type,
       EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_name') as has_sender_name;

-- Check for Booking System Updates
SELECT 'Booking System' as category,
       EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'class_bookings' AND column_name = 'client_id') as has_client_id,
       EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'class_bookings' AND column_name = 'organization_id') as has_org_id,
       EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'recurring_bookings' AND column_name = 'client_id') as recurring_client_id;

-- Check if schema_migrations table exists
SELECT 'Migration Tracking' as category,
       EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_migrations') as has_migrations_table;

-- List all recent migrations (if schema_migrations exists)
SELECT 'Recent Migrations Applied' as info, filename, executed_at 
FROM schema_migrations 
WHERE executed_at > NOW() - INTERVAL '30 days'
ORDER BY executed_at DESC
LIMIT 10;