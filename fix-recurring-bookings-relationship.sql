-- FIX: Add recurring_booking_id column to class_bookings if needed
-- This allows optional linking to recurring bookings without forcing joins

-- First ensure recurring_bookings table exists
CREATE TABLE IF NOT EXISTS recurring_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    class_type_id UUID,
    recurrence_type VARCHAR(50) DEFAULT 'weekly',
    recurrence_pattern JSONB,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    current_bookings INTEGER DEFAULT 0,
    max_bookings INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT check_customer_or_client_recurring CHECK (
        (client_id IS NOT NULL AND customer_id IS NULL) OR 
        (client_id IS NULL AND customer_id IS NOT NULL)
    )
);

-- Add recurring_booking_id to class_bookings if it doesn't exist
ALTER TABLE class_bookings 
ADD COLUMN IF NOT EXISTS recurring_booking_id UUID REFERENCES recurring_bookings(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_client_id ON recurring_bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_customer_id ON recurring_bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_recurring_bookings_organization_id ON recurring_bookings(organization_id);
CREATE INDEX IF NOT EXISTS idx_class_bookings_recurring_booking_id ON class_bookings(recurring_booking_id);

-- Enable RLS on recurring_bookings
ALTER TABLE recurring_bookings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for recurring_bookings
DROP POLICY IF EXISTS "Users can view org recurring bookings" ON recurring_bookings;
CREATE POLICY "Users can view org recurring bookings" ON recurring_bookings
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
    OR true -- Allow public view for booking widgets
  );

DROP POLICY IF EXISTS "Users can manage org recurring bookings" ON recurring_bookings;
CREATE POLICY "Users can manage org recurring bookings" ON recurring_bookings
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON recurring_bookings TO authenticated;
GRANT SELECT, INSERT ON recurring_bookings TO anon;

-- Verify the fix
SELECT 
  'Recurring bookings relationship fixed!' as status,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'recurring_bookings') as recurring_bookings_exists,
  EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'class_bookings' AND column_name = 'recurring_booking_id'
  ) as recurring_booking_id_column_exists;