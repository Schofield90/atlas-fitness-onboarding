-- Create contacts table for managing messaging preferences
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  lead_id UUID REFERENCES leads(id),
  client_id UUID REFERENCES clients(id),
  sms_opt_in BOOLEAN DEFAULT true,
  whatsapp_opt_in BOOLEAN DEFAULT true,
  email_opt_in BOOLEAN DEFAULT true,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_lead_id ON contacts(lead_id);
CREATE INDEX idx_contacts_client_id ON contacts(client_id);
CREATE INDEX idx_contacts_opt_in ON contacts(sms_opt_in, whatsapp_opt_in, email_opt_in);

-- Create updated_at trigger
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Add RLS policies
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view contacts
CREATE POLICY "Users can view contacts" ON contacts
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to update their own contact preferences
CREATE POLICY "Users can update their contact preferences" ON contacts
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (
      lead_id IN (SELECT id FROM leads WHERE email = auth.email()) OR
      client_id IN (SELECT id FROM clients WHERE email = auth.email())
    )
  );

-- Allow service role full access
CREATE POLICY "Service role can manage contacts" ON contacts
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Create a function to sync contacts from leads and clients
CREATE OR REPLACE FUNCTION sync_contact_from_lead()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO contacts (phone, email, first_name, last_name, lead_id)
  VALUES (NEW.phone, NEW.email, NEW.first_name, NEW.last_name, NEW.id)
  ON CONFLICT (phone) DO UPDATE SET
    email = COALESCE(contacts.email, EXCLUDED.email),
    first_name = COALESCE(contacts.first_name, EXCLUDED.first_name),
    last_name = COALESCE(contacts.last_name, EXCLUDED.last_name),
    lead_id = EXCLUDED.lead_id,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_contact_from_client()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO contacts (phone, email, first_name, last_name, client_id)
  VALUES (NEW.phone, NEW.email, NEW.first_name, NEW.last_name, NEW.id)
  ON CONFLICT (phone) DO UPDATE SET
    email = COALESCE(contacts.email, EXCLUDED.email),
    first_name = COALESCE(contacts.first_name, EXCLUDED.first_name),
    last_name = COALESCE(contacts.last_name, EXCLUDED.last_name),
    client_id = EXCLUDED.client_id,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to sync contacts
CREATE TRIGGER sync_lead_to_contact
  AFTER INSERT OR UPDATE OF phone, email, first_name, last_name ON leads
  FOR EACH ROW
  WHEN (NEW.phone IS NOT NULL)
  EXECUTE FUNCTION sync_contact_from_lead();

CREATE TRIGGER sync_client_to_contact
  AFTER INSERT OR UPDATE OF phone, email, first_name, last_name ON clients
  FOR EACH ROW
  WHEN (NEW.phone IS NOT NULL)
  EXECUTE FUNCTION sync_contact_from_client();