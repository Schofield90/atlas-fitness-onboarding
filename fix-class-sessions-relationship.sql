-- FIX: Relationship between class_bookings and class_sessions
-- This ensures the foreign key relationships are properly set up

-- First, verify that class_sessions table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'class_sessions') THEN
    RAISE NOTICE 'Creating class_sessions table...';
    
    CREATE TABLE class_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
      schedule_id UUID,
      name VARCHAR(255),
      description TEXT,
      start_time TIMESTAMP WITH TIME ZONE,
      end_time TIMESTAMP WITH TIME ZONE,
      max_capacity INTEGER DEFAULT 20,
      current_bookings INTEGER DEFAULT 0,
      room_location VARCHAR(255),
      instructor_name VARCHAR(255),
      status VARCHAR(50) DEFAULT 'scheduled',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create indexes
    CREATE INDEX idx_class_sessions_organization_id ON class_sessions(organization_id);
    CREATE INDEX idx_class_sessions_start_time ON class_sessions(start_time);
    CREATE INDEX idx_class_sessions_status ON class_sessions(status);
  END IF;
END $$;

-- Ensure the foreign key relationship exists in class_bookings
DO $$
BEGIN
  -- Check if the foreign key constraint already exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'class_bookings_class_session_id_fkey' 
    AND table_name = 'class_bookings'
  ) THEN
    -- Add the foreign key constraint if it doesn't exist
    ALTER TABLE class_bookings 
    ADD CONSTRAINT class_bookings_class_session_id_fkey 
    FOREIGN KEY (class_session_id) 
    REFERENCES class_sessions(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- If there's a schedules table that should be linked, create that relationship too
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'schedules') THEN
    -- Add schedule_id to class_sessions if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'class_sessions' AND column_name = 'schedule_id'
    ) THEN
      ALTER TABLE class_sessions 
      ADD COLUMN schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Grant permissions
GRANT ALL ON class_sessions TO authenticated;
GRANT SELECT, INSERT ON class_sessions TO anon;

-- Enable RLS on class_sessions
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for class_sessions
DROP POLICY IF EXISTS "Public can view class sessions" ON class_sessions;
CREATE POLICY "Public can view class sessions" ON class_sessions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage org class sessions" ON class_sessions;
CREATE POLICY "Users can manage org class sessions" ON class_sessions
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

-- Create some test data if the table is empty (optional - comment out in production)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM class_sessions LIMIT 1) THEN
    INSERT INTO class_sessions (
      organization_id,
      name,
      description,
      start_time,
      end_time,
      max_capacity,
      room_location,
      instructor_name,
      status
    ) 
    SELECT 
      o.id,
      'Sample Class Session',
      'A sample class session for testing',
      NOW() + INTERVAL '1 day',
      NOW() + INTERVAL '1 day' + INTERVAL '1 hour',
      20,
      'Main Studio',
      'John Doe',
      'scheduled'
    FROM organizations o
    LIMIT 1;
  END IF;
END $$;

-- Verify the fix
SELECT 
  'Relationships Fixed!' as status,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'class_sessions') as class_sessions_exists,
  EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'class_bookings' AND column_name = 'class_session_id'
  ) as class_session_id_column_exists,
  EXISTS(
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'class_bookings_class_session_id_fkey' 
    AND table_name = 'class_bookings'
  ) as foreign_key_exists;