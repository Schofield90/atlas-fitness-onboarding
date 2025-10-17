import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const adminSupabase = createAdminClient();
    
    // Security check - only allow for specific email
    const { email } = await request.json();
    if (email !== "sam@atlas-gyms.co.uk") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    console.log("🚨 Emergency fix for sam@atlas-gyms.co.uk authentication issues");

    // Step 1: Get user from auth.users
    const { data: authUsers } = await adminSupabase.auth.admin.listUsers();
    const samUser = authUsers.users.find(u => u.email === 'sam@atlas-gyms.co.uk');
    
    if (!samUser) {
      return NextResponse.json({ error: "User not found in auth system" }, { status: 404 });
    }

    const userId = samUser.id;
    const orgId = '63589490-8f55-4157-bd3a-e141594b748e';

    console.log("Found user:", userId);

    // Step 2: Ensure user exists in users table
    const { error: userError } = await adminSupabase
      .from('users')
      .upsert({
        id: userId,
        email: 'sam@atlas-gyms.co.uk',
        name: 'Sam',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (userError) {
      console.error("Error upserting user:", userError);
    } else {
      console.log("✅ User record ensured");
    }

    // Step 3: Ensure organization exists with Sam as owner
    const { error: orgError } = await adminSupabase
      .from('organizations')
      .upsert({
        id: orgId,
        name: 'Atlas Fitness',
        owner_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        settings: {},
        metadata: {}
      }, {
        onConflict: 'id'
      });

    if (orgError) {
      console.error("Error upserting organization:", orgError);
    } else {
      console.log("✅ Organization record ensured with owner_id");
    }

    // Step 4: Ensure user_organizations entry exists
    // First, try to delete any existing record to avoid conflicts
    await adminSupabase
      .from('user_organizations')
      .delete()
      .eq('user_id', userId);

    const { error: userOrgError } = await adminSupabase
      .from('user_organizations')
      .insert({
        user_id: userId,
        organization_id: orgId,
        role: 'owner',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (userOrgError) {
      console.error("Error creating user_organizations:", userOrgError);
      // Try update if insert fails
      const { error: updateError } = await adminSupabase
        .from('user_organizations')
        .update({
          organization_id: orgId,
          role: 'owner',
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      if (updateError) {
        console.error("Error updating user_organizations:", updateError);
      }
    } else {
      console.log("✅ user_organizations record created");
    }

    // Step 5: Ensure organization_members entry exists (for backward compatibility)
    await adminSupabase
      .from('organization_members')
      .upsert({
        user_id: userId,
        organization_id: orgId,
        role: 'owner',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,organization_id'
      });

    console.log("✅ organization_members record ensured");

    // Step 6: Ensure organization_staff entry exists
    await adminSupabase
      .from('organization_staff')
      .upsert({
        user_id: userId,
        organization_id: orgId,
        role: 'owner',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,organization_id'
      });

    console.log("✅ organization_staff record ensured");

    // Step 7: Verify the data was created correctly
    const verifications = await Promise.all([
      adminSupabase.from('users').select('*').eq('id', userId).single(),
      adminSupabase.from('organizations').select('*').eq('id', orgId).single(),
      adminSupabase.from('user_organizations').select('*').eq('user_id', userId).single(),
      adminSupabase.from('organization_members').select('*').eq('user_id', userId).eq('organization_id', orgId).single(),
      adminSupabase.from('organization_staff').select('*').eq('user_id', userId).eq('organization_id', orgId).single()
    ]);

    const [userCheck, orgCheck, userOrgCheck, memberCheck, staffCheck] = verifications;

    const results = {
      user: userCheck.data ? '✅' : '❌',
      organization: orgCheck.data ? '✅' : '❌',
      user_organizations: userOrgCheck.data ? '✅' : '❌',
      organization_members: memberCheck.data ? '✅' : '❌',
      organization_staff: staffCheck.data ? '✅' : '❌'
    };

    console.log("Verification results:", results);

    // Step 8: Test if we can now query the data
    const { data: testOrgQuery, error: testOrgError } = await adminSupabase
      .from('organizations')
      .select('*')
      .eq('id', orgId);

    const { data: testUserOrgQuery, error: testUserOrgError } = await adminSupabase
      .from('user_organizations')
      .select('*')
      .eq('user_id', userId);

    return NextResponse.json({
      success: true,
      message: "Emergency fix applied successfully",
      userId,
      organizationId: orgId,
      verifications: results,
      canQueryOrg: !!testOrgQuery && !testOrgError,
      canQueryUserOrg: !!testUserOrgQuery && !testUserOrgError,
      details: {
        user: userCheck.data,
        organization: orgCheck.data,
        user_organizations: userOrgCheck.data,
        organization_members: memberCheck.data,
        organization_staff: staffCheck.data
      }
    });

  } catch (error: any) {
    console.error("Emergency fix error:", error);
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

// GET endpoint to check current status
export async function GET(request: NextRequest) {
  try {
    const adminSupabase = createAdminClient();
    
    // Get Sam's user ID
    const { data: authUsers } = await adminSupabase.auth.admin.listUsers();
    const samUser = authUsers.users.find(u => u.email === 'sam@atlas-gyms.co.uk');
    
    if (!samUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = samUser.id;
    const orgId = '63589490-8f55-4157-bd3a-e141594b748e';

    // Check all relevant tables
    const checks = await Promise.all([
      adminSupabase.from('users').select('*').eq('id', userId).single(),
      adminSupabase.from('organizations').select('*').eq('id', orgId).single(),
      adminSupabase.from('user_organizations').select('*').eq('user_id', userId),
      adminSupabase.from('organization_members').select('*').eq('user_id', userId),
      adminSupabase.from('organization_staff').select('*').eq('user_id', userId)
    ]);

    const [userCheck, orgCheck, userOrgCheck, memberCheck, staffCheck] = checks;

    return NextResponse.json({
      userId,
      status: {
        user: userCheck.data ? '✅ Exists' : '❌ Missing',
        organization: orgCheck.data ? `✅ Exists (owner: ${orgCheck.data.owner_id === userId ? 'YES' : 'NO'})` : '❌ Missing',
        user_organizations: userOrgCheck.data?.length ? `✅ ${userOrgCheck.data.length} record(s)` : '❌ Missing',
        organization_members: memberCheck.data?.length ? `✅ ${memberCheck.data.length} record(s)` : '❌ Missing',
        organization_staff: staffCheck.data?.length ? `✅ ${staffCheck.data.length} record(s)` : '❌ Missing'
      },
      data: {
        user: userCheck.data,
        organization: orgCheck.data,
        user_organizations: userOrgCheck.data,
        organization_members: memberCheck.data,
        organization_staff: staffCheck.data
      }
    });

  } catch (error: any) {
    console.error("Status check error:", error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}