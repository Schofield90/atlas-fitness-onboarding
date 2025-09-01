import { createAdminClient } from '../app/lib/supabase/admin'

async function fixUserSignup() {
  const supabase = createAdminClient()
  
  console.log('Fixing user signup...')
  
  // First, let's check if the trigger already exists
  const { data: existingTrigger, error: checkError } = await supabase
    .rpc('check_trigger_exists', { trigger_name: 'on_auth_user_created' })
    .single()
  
  if (checkError) {
    console.log('No existing trigger found, creating new one...')
  }
  
  // Create the function and trigger
  const migrationSQL = `
    -- Create function to handle new user creation
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger AS $$
    BEGIN
      -- Insert new user into public.users table
      INSERT INTO public.users (
        id,
        email,
        full_name,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NOW(),
        NOW()
      ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
        updated_at = NOW();
      
      -- If organization_name is provided in metadata, create organization
      IF NEW.raw_user_meta_data->>'organization_name' IS NOT NULL THEN
        INSERT INTO public.organizations (
          id,
          name,
          owner_id,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          NEW.raw_user_meta_data->>'organization_name',
          NEW.id,
          NOW(),
          NOW()
        );
      END IF;
      
      RETURN NEW;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail the signup
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Drop existing trigger if it exists
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

    -- Create trigger for new user signup
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  `
  
  // Execute the migration
  const { error: migrationError } = await supabase.rpc('exec_sql', { 
    sql_query: migrationSQL 
  })
  
  if (migrationError) {
    console.error('Error running migration:', migrationError)
    
    // Try a simpler approach - just ensure sam@gymleadhub.co.uk can be created
    console.log('Attempting direct user creation for sam@gymleadhub.co.uk...')
    
    // Get the auth user ID for sam@gymleadhub.co.uk if it exists
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const samUser = authUsers?.users?.find(u => u.email === 'sam@gymleadhub.co.uk')
    
    if (samUser) {
      // Create the user record
      const { error: insertError } = await supabase
        .from('users')
        .upsert({
          id: samUser.id,
          email: 'sam@gymleadhub.co.uk',
          full_name: 'Sam'
        })
      
      if (insertError) {
        console.error('Error creating user record:', insertError)
      } else {
        console.log('Successfully created user record for sam@gymleadhub.co.uk')
      }
    }
  } else {
    console.log('Migration successful!')
  }
  
  // Also sync any existing auth users
  console.log('Syncing existing auth users...')
  const { data: authUsers } = await supabase.auth.admin.listUsers()
  
  if (authUsers?.users) {
    for (const authUser of authUsers.users) {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0]
        })
      
      if (error) {
        console.error(`Error syncing user ${authUser.email}:`, error)
      } else {
        console.log(`Synced user ${authUser.email}`)
      }
    }
  }
  
  console.log('Done!')
  process.exit(0)
}

fixUserSignup().catch(console.error)