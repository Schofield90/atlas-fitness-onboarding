const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k'

async function createUser() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  console.log('Creating user sam@gymleadhub.co.uk...')
  
  // First check if user already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'sam@gymleadhub.co.uk')
    .single()
  
  if (existingUser) {
    console.log('User already exists in public.users')
    return
  }
  
  // Try to create via auth admin
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'sam@gymleadhub.co.uk',
    password: '${DB_PASSWORD}',
    email_confirm: true,
    user_metadata: {
      full_name: 'Sam',
      organization_name: 'GymLeadHub'
    }
  })
  
  if (authError) {
    console.error('Auth error:', authError.message)
    console.log('\nThe Supabase Auth service is having issues.')
    console.log('Please run the SQL directly in the Supabase dashboard SQL editor.')
    return
  }
  
  if (authData?.user) {
    console.log('✅ User created successfully!')
    console.log('Email: sam@gymleadhub.co.uk')
    console.log('Password: ${DB_PASSWORD}')
    console.log('User ID:', authData.user.id)
    
    // Create user in public.users
    const { error: publicError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: 'sam@gymleadhub.co.uk'
      })
    
    if (publicError) {
      console.log('Note: Could not create public user record:', publicError.message)
    }
    
    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: 'GymLeadHub',
        slug: 'gymleadhub-' + Date.now()
      })
      .select()
      .single()
    
    if (org) {
      console.log('✅ Organization created:', org.id)
      
      // Link user to org
      await supabase
        .from('organization_members')
        .insert({
          user_id: authData.user.id,
          org_id: org.id,
          role: 'owner'
        })
    }
  }
}

createUser().catch(console.error)