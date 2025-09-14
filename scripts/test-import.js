// Test script to debug import issue
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lzlrojoaxrqvmhempnkn.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY'
);

// Sample data from the CSV
const sampleData = {
  "DOB": "1969-01-06",
  "City": "York",
  "Email": "test.import@example.com",
  "Phone": "07595588728",
  "Country": "United Kingdom",
  "Postcode": "YO611UB",
  "Last Name": "TestLast",
  "First Name": "TestFirst",
  "Address Line 1": "123 Test Street",
  "Emergency Contact Name": "Emergency Contact",
  "Emergency Contact Phone": "07528389394"
};

// Field mappings from the job
const fieldMappings = {
  "DOB": "date_of_birth",
  "City": "city",
  "Email": "email",
  "Phone": "phone",
  "Country": "country",
  "Postcode": "postcode",
  "Last Name": "last_name",
  "First Name": "first_name",
  "Explanation": "notes",
  "Address Line 1": "address",
  "Emergency Contact Name": "emergency_contact_name",
  "Emergency Contact Phone": "emergency_contact_phone"
};

async function testImport() {
  // Map the data
  const clientData = {
    organization_id: '63589490-8f55-4157-bd3a-e141594b748e',
    created_at: new Date().toISOString()
  };

  // Apply field mappings
  for (const [sourceField, targetField] of Object.entries(fieldMappings)) {
    if (sampleData[sourceField] !== undefined && sampleData[sourceField] !== '') {
      let value = sampleData[sourceField];
      
      // Handle date fields
      if (targetField === 'date_of_birth' && value) {
        try {
          const date = new Date(value);
          value = date.toISOString();
        } catch (e) {
          console.error('Date conversion error:', e);
        }
      }
      
      clientData[targetField] = value;
    }
  }

  console.log('Mapped client data:', JSON.stringify(clientData, null, 2));

  // Try to insert
  const { data, error } = await supabase
    .from('clients')
    .insert(clientData)
    .select()
    .single();

  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Insert successful:', data);
  }
}

testImport().catch(console.error);