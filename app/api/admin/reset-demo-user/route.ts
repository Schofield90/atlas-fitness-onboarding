import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const targetEmail = 'test@test.co.uk';
    const targetPassword = 'Test123';
    const orgId = 'c762845b-34fc-41ea-9e01-f70b81c44ff7';

    console.log('🔧 Resetting demo user:', targetEmail);

    // Try to find existing user
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return NextResponse.json({
        error: 'Database permission error',
        details: listError.message,
        suggestion: 'Run GRANT statements in Supabase SQL editor'
      }, { status: 500 });
    }

    const existingUser = users.find(u => u.email === targetEmail);

    let userId: string;

    if (existingUser) {
      console.log('✅ Found existing user:', existingUser.id);
      userId = existingUser.id;

      // Update password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        userId,
        {
          password: targetPassword,
          email_confirm: true
        }
      );

      if (updateError) {
        return NextResponse.json({
          error: 'Failed to update password',
          details: updateError.message
        }, { status: 500 });
      }

      console.log('✅ Password updated');
    } else {
      console.log('User not found, creating new user...');

      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: targetEmail,
        password: targetPassword,
        email_confirm: true,
        user_metadata: {
          first_name: 'Test',
          last_name: 'User'
        }
      });

      if (createError || !newUser.user) {
        return NextResponse.json({
          error: 'Failed to create user',
          details: createError?.message
        }, { status: 500 });
      }

      userId = newUser.user.id;
      console.log('✅ User created:', userId);
    }

    // Ensure organization link
    const { error: orgLinkError } = await supabase
      .from('user_organizations')
      .upsert({
        user_id: userId,
        organization_id: orgId,
        role: 'admin'
      }, { onConflict: 'user_id,organization_id' });

    if (orgLinkError) {
      console.error('Warning: Could not link organization:', orgLinkError.message);
    } else {
      console.log('✅ Organization linked');
    }

    // Ensure staff record
    const { error: staffError } = await supabase
      .from('organization_staff')
      .upsert({
        user_id: userId,
        organization_id: orgId,
        name: 'Test User',
        email: targetEmail,
        phone_number: '07123456789',
        role: 'owner'
      }, { onConflict: 'organization_id,email' });

    if (staffError) {
      console.error('Warning: Could not create staff record:', staffError.message);
    } else {
      console.log('✅ Staff record created');
    }

    return NextResponse.json({
      success: true,
      message: 'Demo user reset successfully',
      userId: userId,
      credentials: {
        email: targetEmail,
        password: targetPassword,
        url: 'https://login.gymleadhub.co.uk/owner-login'
      }
    });

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({
      error: 'Unexpected error',
      details: error.message
    }, { status: 500 });
  }
}
