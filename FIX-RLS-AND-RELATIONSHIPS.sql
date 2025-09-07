-- Fix Row Level Security policies for class_bookings table
-- This allows authenticated users to create and view bookings

-- First, check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'class_bookings';

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their bookings" ON class_bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON class_bookings;
DROP POLICY IF EXISTS "Users can update their bookings" ON class_bookings;

-- Create new RLS policies that allow operations
-- Allow users to view bookings in their organization
CREATE POLICY "Users can view bookings in their organization" ON class_bookings
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

-- Allow users to create bookings in their organization
CREATE POLICY "Users can create bookings in their organization" ON class_bookings
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

-- Allow users to update bookings in their organization
CREATE POLICY "Users can update bookings in their organization" ON class_bookings
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

-- Grant permissions
GRANT ALL ON class_bookings TO authenticated;
GRANT ALL ON class_bookings TO anon;

-- Create the foreign key relationship between class_bookings and schedules
-- First check if the foreign key already exists
SELECT 
    conname AS constraint_name
FROM 
    pg_constraint 
WHERE 
    conrelid = 'class_bookings'::regclass 
    AND confrelid = 'schedules'::regclass;

-- If it doesn't exist, create it
ALTER TABLE class_bookings 
DROP CONSTRAINT IF EXISTS class_bookings_schedule_id_fkey;

ALTER TABLE class_bookings 
ADD CONSTRAINT class_bookings_schedule_id_fkey 
FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE;

-- Verify the policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM 
    pg_policies 
WHERE 
    tablename = 'class_bookings';

-- Test: Try to insert a dummy booking to verify RLS works
-- This should succeed if policies are correct
INSERT INTO class_bookings (
    id,
    schedule_id, 
    client_id,
    organization_id,
    status,
    booked_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM schedules WHERE organization_id = '63589490-8f55-4157-bd3a-e141594b748e' LIMIT 1),
    '1df0e47c-1892-4b1e-ad32-956ebdbf0bab',
    '63589490-8f55-4157-bd3a-e141594b748e',
    'test',
    NOW()
);

-- Clean up the test booking
DELETE FROM class_bookings WHERE status = 'test';

SELECT 'RLS policies and relationships fixed!' as status;