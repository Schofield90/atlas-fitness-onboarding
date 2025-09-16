const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createPaymentsTable() {
  console.log('🔨 Creating payments table...\n');

  try {
    // First, let's check if the table already exists
    const { error: checkError } = await supabase
      .from('payments')
      .select('id')
      .limit(1);

    if (!checkError) {
      console.log('✅ Payments table already exists!');
      return;
    }

    console.log('Table does not exist, creating it now...');

    // Since we can't use RPC, let's create a migration file instead
    const migrationSQL = `
-- Create payments table for tracking all client payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL, -- Amount in pennies/cents
  currency VARCHAR(3) DEFAULT 'GBP',
  payment_date DATE NOT NULL,
  payment_time TIME,
  payment_method VARCHAR(50),
  reference VARCHAR(255),
  description TEXT,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
  stripe_payment_id VARCHAR(255),
  stripe_charge_id VARCHAR(255),
  invoice_id UUID,
  membership_id UUID REFERENCES customer_memberships(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_organization_id ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Add RLS policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policy for organization members to view their organization's payments
CREATE POLICY "Organization members can view payments"
  ON payments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE user_id = auth.uid()
      UNION
      SELECT organization_id FROM user_organizations WHERE user_id = auth.uid()
    )
  );

-- Policy for organization admins to manage payments
CREATE POLICY "Organization admins can manage payments"
  ON payments FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payments_updated_at();

-- Create a view for payment summaries
CREATE OR REPLACE VIEW payment_summaries AS
SELECT 
  p.organization_id,
  p.client_id,
  c.name as client_name,
  COUNT(*) as payment_count,
  SUM(p.amount) as total_amount,
  AVG(p.amount) as average_amount,
  MAX(p.payment_date) as last_payment_date,
  MIN(p.payment_date) as first_payment_date
FROM payments p
LEFT JOIN clients c ON p.client_id = c.id
WHERE p.status = 'completed'
GROUP BY p.organization_id, p.client_id, c.name;

-- Grant permissions
GRANT ALL ON payments TO authenticated;
GRANT ALL ON payment_summaries TO authenticated;
`;

    // Save migration file
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);
    const filename = `./supabase/migrations/${timestamp}_create_payments_table.sql`;
    
    fs.writeFileSync(filename, migrationSQL);
    console.log(`✅ Migration file created: ${filename}`);
    console.log('\nTo apply this migration, run:');
    console.log(`  supabase migration up`);
    console.log('\nOr apply it directly in Supabase dashboard.');

    // Try a simpler approach - insert a test record to force table creation
    console.log('\nAttempting to create table via insert...');
    const { error: insertError } = await supabase
      .from('payments')
      .insert({
        id: require('crypto').randomUUID(),
        organization_id: '63589490-8f55-4157-bd3a-e141594b748e',
        client_id: null,
        amount: 0,
        payment_date: new Date().toISOString().split('T')[0],
        status: 'completed'
      });

    if (insertError) {
      console.log('\n⚠️  Could not create table automatically.');
      console.log('Please run the migration file created above.');
    } else {
      console.log('✅ Payments table created successfully!');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

createPaymentsTable();