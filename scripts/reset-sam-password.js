const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetPassword() {
  console.log('Resetting password for sam@atlas-gyms.co.uk...\n');
  
  try {
    // Update the user's password
    const { data, error } = await supabase.auth.admin.updateUserById(
      'ea1fc8e3-35a2-4c59-80af-5fde557391a1',
      { password: 'Gyms2020!' }
    );
    
    if (error) {
      console.error('❌ Error resetting password:', error.message);
      return;
    }
    
    console.log('✅ Password reset successfully!');
    console.log('User ID:', data.user.id);
    console.log('Email:', data.user.email);
    
    // Now test login with the new password
    console.log('\nTesting login with new password...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'sam@atlas-gyms.co.uk',
      password: 'Gyms2020!'
    });
    
    if (loginError) {
      console.error('❌ Login failed:', loginError.message);
    } else {
      console.log('✅ Login successful!');
      console.log('Session created:', loginData.session ? 'Yes' : 'No');
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

resetPassword();