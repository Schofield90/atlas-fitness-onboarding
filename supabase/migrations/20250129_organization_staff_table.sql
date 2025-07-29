-- Create organization_staff table for staff management
CREATE TABLE IF NOT EXISTS organization_staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT, -- Can be UUID or pending string
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  role TEXT DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'staff', 'trainer')),
  is_available BOOLEAN DEFAULT true,
  receives_calls BOOLEAN DEFAULT true,
  receives_sms BOOLEAN DEFAULT true,
  receives_whatsapp BOOLEAN DEFAULT true,
  receives_emails BOOLEAN DEFAULT true,
  routing_priority INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(organization_id, email)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_organization_staff_org ON organization_staff(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_staff_email ON organization_staff(email);
CREATE INDEX IF NOT EXISTS idx_organization_staff_available ON organization_staff(is_available);

-- Enable RLS
ALTER TABLE organization_staff ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Organization access for organization_staff" ON organization_staff
  FOR ALL USING (organization_id IS NOT NULL);

-- Create update trigger
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_organization_staff_updated_at') THEN
        CREATE TRIGGER update_organization_staff_updated_at 
        BEFORE UPDATE ON organization_staff 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;