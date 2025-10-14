// Quick script to check if user is admin and add them if not
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const userId = 'a625a432-d577-478e-b987-16734faff30f';
const orgId = 'c762845b-34fc-41ea-9e01-f70b81c44ff7'; // Demo Fitness Studio
const email = 'test2@test.co.uk';

async function checkAndAddAdmin() {
  console.log('\n🔍 Checking staff table for user:', userId);
  console.log('   Email:', email);
  console.log('   Organization:', orgId);

  // Check current status
  const { data: existing, error: checkError } = await supabase
    .from('staff')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (checkError) {
    console.error('❌ Error checking staff:', checkError);
    return;
  }

  if (existing) {
    console.log('\n✅ User already in staff table:', existing);
    console.log('   Current Role:', existing.metadata?.role);
    console.log('   Current Active Status:', existing.metadata?.is_active);

    if (existing.metadata?.role !== 'superadmin') {
      console.log('\n⚠️  User is NOT a superadmin, updating...');

      const { data: updated, error: updateError } = await supabase
        .from('staff')
        .update({
          metadata: {
            role: 'superadmin',
            is_active: true
          }
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating staff:', updateError);
      } else {
        console.log('✅ User updated to superadmin:', updated);
      }
    }
  } else {
    console.log('\n⚠️  User NOT in staff table, adding...');

    const { data: inserted, error: insertError} = await supabase
      .from('staff')
      .insert({
        org_id: orgId,
        user_id: userId,
        metadata: {
          role: 'superadmin',
          is_active: true
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting staff:', insertError);
    } else {
      console.log('✅ User added as superadmin:', inserted);
    }
  }

  // Verify final status
  const { data: final, error: finalError } = await supabase
    .from('staff')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (finalError) {
    console.error('❌ Error verifying final status:', finalError);
    return;
  }

  console.log('\n✅ FINAL STATUS:');
  console.log('   Staff ID:', final.id);
  console.log('   User ID:', final.user_id);
  console.log('   Organization ID:', final.org_id);
  console.log('   Role:', final.metadata?.role);
  console.log('   Active:', final.metadata?.is_active);
  console.log('\n🎉 You can now access /admin as a superadmin!');
}

checkAndAddAdmin();
