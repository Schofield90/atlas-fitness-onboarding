const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const organizationId = '63589490-8f55-4157-bd3a-e141594b748e';

async function checkLeadClientRelationship() {
  console.log('🔍 Checking lead-client relationship...\n');

  try {
    // 1. Check leads table structure
    console.log('1. Checking leads table:');
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('organization_id', organizationId)
      .limit(1)
      .single();

    if (lead) {
      console.log('Lead columns:', Object.keys(lead));
      console.log('\nChecking for client reference:');
      console.log('  client_id:', lead.client_id || 'not found');
      console.log('  customer_id:', lead.customer_id || 'not found');
    }

    // 2. Check if leads and clients share email/phone
    console.log('\n2. Finding leads that match clients by email:');
    const { data: leads } = await supabase
      .from('leads')
      .select('id, name, email, phone')
      .eq('organization_id', organizationId)
      .limit(5);

    for (const lead of leads || []) {
      // Try to find matching client
      let client = null;
      
      if (lead.email) {
        const { data } = await supabase
          .from('clients')
          .select('id, name')
          .eq('organization_id', organizationId)
          .eq('email', lead.email)
          .single();
        client = data;
      }
      
      if (!client && lead.phone) {
        const { data } = await supabase
          .from('clients')
          .select('id, name')
          .eq('organization_id', organizationId)
          .eq('phone', lead.phone)
          .single();
        client = data;
      }

      if (client) {
        console.log(`  ✓ Lead "${lead.name}" matches Client "${client.name}" (ID: ${client.id})`);
      } else {
        console.log(`  ✗ Lead "${lead.name}" has no matching client`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkLeadClientRelationship();