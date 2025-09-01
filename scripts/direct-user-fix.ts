import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lzlrojoaxrqvmhempnkn.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6bHJvam9heHJxdm1oZW1wbmtuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ5MjUzOSwiZXhwIjoyMDY4MDY4NTM5fQ.CR3k3p1_LV_p8g8Pg1mDOTmKznTpmmqhg6o074q3x4k'

async function fixUserAccount() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('Starting direct user fix for sam@gymleadhub.co.uk...')

  try {
    // First, check if auth user exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return
    }

    const existingUser = users?.find(u => u.email === 'sam@gymleadhub.co.uk')
    
    if (existingUser) {
      console.log('Auth user exists with ID:', existingUser.id)
      
      // Ensure user record exists in public.users
      const { data: publicUser, error: checkError } = await supabase
        .from('users')
        .select('*')
        .eq('id', existingUser.id)
        .single()
      
      if (checkError && checkError.code === 'PGRST116') {
        // User doesn't exist in public.users, create it
        console.log('Creating public.users record...')
        
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: existingUser.id,
            email: 'sam@gymleadhub.co.uk',
            full_name: 'Sam',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (insertError) {
          console.error('Error creating public user:', insertError)
        } else {
          console.log('✅ Public user record created successfully')
        }
      } else if (publicUser) {
        console.log('✅ Public user record already exists')
      }
      
      // Create or update organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_id', existingUser.id)
        .single()
      
      if (orgError && orgError.code === 'PGRST116') {
        console.log('Creating organization...')
        
        const { data: newOrg, error: createOrgError } = await supabase
          .from('organizations')
          .insert({
            name: 'GymLeadHub',
            owner_id: existingUser.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (createOrgError) {
          console.error('Error creating organization:', createOrgError)
        } else {
          console.log('✅ Organization created successfully')
          
          // Link user to organization
          await supabase
            .from('user_organizations')
            .upsert({
              user_id: existingUser.id,
              organization_id: newOrg.id,
              role: 'owner'
            })
        }
      } else if (org) {
        console.log('✅ Organization already exists')
      }
      
    } else {
      console.log('Auth user does not exist. Creating new user...')
      
      // Create new auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: 'sam@gymleadhub.co.uk',
        password: 'TempPassword123!',
        email_confirm: true,
        user_metadata: {
          full_name: 'Sam',
          organization_name: 'GymLeadHub'
        }
      })
      
      if (authError) {
        console.error('Error creating auth user:', authError)
        return
      }
      
      console.log('✅ Auth user created with ID:', authData.user.id)
      
      // Create public user record
      const { error: publicError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: 'sam@gymleadhub.co.uk',
          full_name: 'Sam',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (publicError) {
        console.error('Error creating public user:', publicError)
      } else {
        console.log('✅ Public user record created')
      }
      
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: 'GymLeadHub',
          owner_id: authData.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (!orgError && org) {
        console.log('✅ Organization created')
        
        // Link user to organization
        await supabase
          .from('user_organizations')
          .insert({
            user_id: authData.user.id,
            organization_id: org.id,
            role: 'owner'
          })
      }
      
      console.log('\n🎉 User created successfully!')
      console.log('Email: sam@gymleadhub.co.uk')
      console.log('Temporary Password: TempPassword123!')
      console.log('Please log in and change your password.')
    }
    
    console.log('\n✅ All operations completed successfully!')
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
  
  process.exit(0)
}

fixUserAccount()