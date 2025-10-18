# Apply Booking Link Submissions Migration

The database migration needs to be applied through the Supabase Dashboard SQL Editor.

## Steps:

1. Go to: https://supabase.com/dashboard/project/lzlrojoaxrqvmhempnkn/sql/new
2. Copy the entire SQL below
3. Paste into the SQL editor
4. Click "Run"
5. Verify success message

## SQL to Execute:

```sql
-- Create booking_link_submissions table to store form submissions from public booking links
CREATE TABLE IF NOT EXISTS booking_link_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_link_id UUID NOT NULL REFERENCES booking_links(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Attendee information
  attendee_name VARCHAR(255) NOT NULL,
  attendee_email VARCHAR(255) NOT NULL,
  attendee_phone VARCHAR(50),

  -- Appointment details
  appointment_type_id UUID,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(100) DEFAULT 'UTC',

  -- Staff assignment
  staff_id UUID,

  -- Additional data
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',

  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  confirmation_token VARCHAR(255),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_booking_submissions_link ON booking_link_submissions(booking_link_id);
CREATE INDEX IF NOT EXISTS idx_booking_submissions_org ON booking_link_submissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_booking_submissions_status ON booking_link_submissions(status);
CREATE INDEX IF NOT EXISTS idx_booking_submissions_start_time ON booking_link_submissions(start_time);
CREATE INDEX IF NOT EXISTS idx_booking_submissions_email ON booking_link_submissions(attendee_email);
CREATE INDEX IF NOT EXISTS idx_booking_submissions_token ON booking_link_submissions(confirmation_token);

-- Enable RLS
ALTER TABLE booking_link_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow organization members to view their submissions
CREATE POLICY "Users can view their organization's booking submissions"
  ON booking_link_submissions
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- Allow public to create submissions (this is a public booking form)
CREATE POLICY "Anyone can create booking submissions"
  ON booking_link_submissions
  FOR INSERT
  WITH CHECK (true);

-- Allow organization members to update their submissions
CREATE POLICY "Users can update their organization's booking submissions"
  ON booking_link_submissions
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- Allow organization members to delete their submissions
CREATE POLICY "Users can delete their organization's booking submissions"
  ON booking_link_submissions
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_booking_link_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_booking_link_submissions_updated_at
  BEFORE UPDATE ON booking_link_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_booking_link_submissions_updated_at();
```

## After Running:

Test the booking form at: http://localhost:3000/book/te
