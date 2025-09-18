const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkClassSessionsStructure() {
  console.log('🔍 Checking class_sessions table structure...\n');

  try {
    // Get sample records from class_sessions
    const { data, error } = await supabase
      .from('class_sessions')
      .select('*')
      .limit(2);

    if (!error && data && data.length > 0) {
      console.log(`✅ Found ${data.length} sample class_sessions`);
      console.log('\nColumns available:');
      const columns = Object.keys(data[0]);
      columns.forEach(col => {
        const value = data[0][col];
        const type = value === null ? 'null' : typeof value;
        console.log(`   ${col}: ${type}`);
      });

      console.log('\nSample record:');
      const sample = data[0];
      Object.entries(sample).forEach(([key, value]) => {
        if (value !== null) {
          const displayValue = typeof value === 'object' ?
            JSON.stringify(value).substring(0, 50) :
            String(value).substring(0, 50);
          console.log(`   ${key}: ${displayValue}`);
        }
      });
    } else {
      console.log('❌ No class_sessions found or error:', error?.message);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
  }
}

checkClassSessionsStructure();