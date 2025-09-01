const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Please check your .env.local file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function grantAdminAccess(email) {
  try {
    console.log(`Granting admin access to ${email}...`)
    
    // Get the user ID from auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error listing users:', authError)
      return
    }
    
    const user = authData.users.find(u => u.email === email)
    
    if (!user) {
      console.error(`User ${email} not found in auth.users`)
      return
    }
    
    console.log(`Found user: ${user.id}`)
    
    // Check if super_admin_users table exists and grant access
    const { data, error } = await supabase
      .from('super_admin_users')
      .upsert({
        user_id: user.id,
        role: 'super_admin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error granting admin access:', error)
      
      // If table doesn't exist, create it
      if (error.message.includes('relation "super_admin_users" does not exist')) {
        console.log('Creating super_admin_users table...')
        
        const { error: createError } = await supabase.rpc('exec_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS public.super_admin_users (
              id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
              user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
              role TEXT NOT NULL DEFAULT 'admin',
              is_active BOOLEAN DEFAULT true,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
              UNIQUE(user_id)
            );
            
            -- Enable RLS
            ALTER TABLE public.super_admin_users ENABLE ROW LEVEL SECURITY;
            
            -- Create policy for super admins to read their own records
            CREATE POLICY "Super admins can read their own records" ON public.super_admin_users
              FOR SELECT USING (auth.uid() = user_id);
          `
        })
        
        if (createError) {
          // Try direct insert without RPC
          console.log('Table might not exist, trying alternative approach...')
        }
        
        // Try again
        const { data: retryData, error: retryError } = await supabase
          .from('super_admin_users')
          .upsert({
            user_id: user.id,
            role: 'super_admin',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          })
          .select()
          .single()
        
        if (retryError) {
          console.error('Failed to grant admin access:', retryError)
        } else {
          console.log('✅ Admin access granted successfully!', retryData)
        }
      }
      return
    }
    
    console.log('✅ Admin access granted successfully!', data)
    
    // Verify the access
    const { data: verifyData, error: verifyError } = await supabase
      .from('super_admin_users')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (verifyData) {
      console.log('✅ Verified: User has admin access with role:', verifyData.role)
    }
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Run the script
grantAdminAccess('sam@atlas-gyms.co.uk')