import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const { orgName, ownerName, ownerEmail } = await request.json();

    if (!orgName || !ownerName || !ownerEmail) {
      return NextResponse.json({ 
        error: 'Missing required fields: orgName, ownerName, ownerEmail' 
      }, { status: 400 });
    }

    // Use service role key to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // First, create the organization
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: orgName,
        email: ownerEmail, // Add the required email field
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orgError) {
      console.error('Organization creation error:', orgError);
      return NextResponse.json({ 
        error: 'Failed to create organization', 
        details: orgError.message 
      }, { status: 500 });
    }

    // Try to create or update a user record
    // Note: This is a simplified approach - in a real app you'd handle auth properly
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', ownerEmail)
      .single();

    if (!existingUser) {
      // Create user record (simplified - normally done through auth)
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email: ownerEmail,
          name: ownerName,
          organization_id: organization.id,
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (userError) {
        console.error('User creation error:', userError);
        // Don't fail the whole process if user creation fails
      }
    } else {
      // Update existing user with organization
      const { error: updateError } = await supabase
        .from('users')
        .update({
          organization_id: organization.id,
          name: ownerName,
          role: 'admin',
          updated_at: new Date().toISOString()
        })
        .eq('email', ownerEmail);

      if (updateError) {
        console.error('User update error:', updateError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Organization created successfully',
      organization: {
        id: organization.id,
        name: organization.name
      },
      next_step: 'Create sample data',
      public_booking_url: `https://atlas-fitness-onboarding.vercel.app/book/public/${organization.id}`
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}