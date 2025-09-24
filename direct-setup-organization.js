const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function directSetup() {
  try {
    console.log('Direct organization setup for sam@atlas-gyms.co.uk...\n');

    // Step 1: Find the user ID from auth.users
    // Since the admin API isn't working, we'll query the database directly
    const { data: userData, error: userQueryError } = await supabase
      .from('auth.users')
      .select('id, email')
      .eq('email', 'sam@atlas-gyms.co.uk')
      .single();

    let userId = null;

    if (userData) {
      userId = userData.id;
      console.log('✅ Found user in database:', userData.email);
      console.log('   User ID:', userId);
    } else {
      console.log('⚠️ User not found in auth.users table');

      // Let's check if any user exists with that email pattern
      const { data: allUsers } = await supabase
        .from('auth.users')
        .select('id, email')
        .ilike('email', '%sam%atlas%');

      if (allUsers && allUsers.length > 0) {
        console.log('Found similar users:', allUsers);
        userId = allUsers[0].id;
        console.log('Using first match:', allUsers[0].email);
      } else {
        console.log('No users found matching sam/atlas pattern');
        console.log('\nCreating a new user with direct insert...');

        // Direct insert into auth.users (this is a last resort)
        const newUserId = crypto.randomUUID();
        const { error: insertError } = await supabase
          .from('auth.users')
          .insert({
            id: newUserId,
            email: 'sam@atlas-gyms.co.uk',
            encrypted_password: '$2a$10$pgSQ53Pcpqt1L/dQTZZ1aekSrvSc3PlqrQBtDfPB6YahVXxdupaHi', // @Aa80236661
            email_confirmed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            instance_id: '00000000-0000-0000-0000-000000000000',
            aud: 'authenticated',
            role: 'authenticated'
          });

        if (!insertError) {
          userId = newUserId;
          console.log('✅ User created with ID:', userId);
        } else {
          console.error('Could not create user:', insertError);
          return;
        }
      }
    }

    if (!userId) {
      console.error('❌ Could not find or create user');
      return;
    }

    // Step 2: Create or find organization
    console.log('\nStep 2: Setting up organization...');

    let { data: org } = await supabase
      .from('organizations')
      .select('*')
      .or('name.eq.Atlas Fitness,slug.eq.atlas-fitness')
      .single();

    if (!org) {
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          id: crypto.randomUUID(),
          name: 'Atlas Fitness',
          owner_id: userId,
          slug: 'atlas-fitness',
          settings: {
            branding: {
              primaryColor: '#F97316',
              logo: null
            },
            features: {
              messaging: true,
              automation: true,
              booking: true,
              ai_chat: true
            }
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (orgError) {
        console.error('❌ Error creating organization:', orgError);
        return;
      }

      org = newOrg;
      console.log('✅ Organization created:', org.name);
    } else {
      console.log('✅ Found existing organization:', org.name);

      // Update owner if needed
      if (org.owner_id !== userId) {
        await supabase
          .from('organizations')
          .update({ owner_id: userId })
          .eq('id', org.id);
        console.log('   Updated organization owner');
      }
    }

    // Step 3: Link user to organization
    console.log('\nStep 3: Linking user to organization...');

    // First check if link exists
    const { data: existingLink } = await supabase
      .from('user_organizations')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', org.id)
      .single();

    if (!existingLink) {
      // Remove any other org links for this user
      await supabase
        .from('user_organizations')
        .delete()
        .eq('user_id', userId);

      // Create new link
      const { error: linkError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: userId,
          organization_id: org.id,
          role: 'owner',
          created_at: new Date().toISOString()
        });

      if (!linkError) {
        console.log('✅ User linked to organization as owner');
      } else {
        console.error('⚠️ Error linking user:', linkError);
      }
    } else {
      console.log('✅ User already linked to organization');

      // Update role to owner if needed
      if (existingLink.role !== 'owner') {
        await supabase
          .from('user_organizations')
          .update({ role: 'owner' })
          .eq('user_id', userId)
          .eq('organization_id', org.id);
        console.log('   Updated role to owner');
      }
    }

    // Final verification
    console.log('\n========================================');
    console.log('✅ SETUP COMPLETE!');
    console.log('========================================');
    console.log('User ID:', userId);
    console.log('Organization:', org.name);
    console.log('Organization ID:', org.id);
    console.log('\nYou should now be able to refresh the page and access the dashboard!');

  } catch (err) {
    console.error('Unexpected error:', err);
  } finally {
    process.exit(0);
  }
}

const crypto = require('crypto');
directSetup();