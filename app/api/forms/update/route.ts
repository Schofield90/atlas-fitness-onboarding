import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { requireAuth } from '@/app/lib/api/auth-check';

export async function PUT(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = createAdminClient();
    
    const formData = await request.json();
    
    if (!formData.id) {
      return NextResponse.json({ 
        error: 'Form ID is required for update' 
      }, { status: 400 });
    }
    
    // Ensure the form belongs to the user's organization
    const { data: existingForm, error: fetchError } = await supabase
      .from('forms')
      .select('organization_id')
      .eq('id', formData.id)
      .single();
    
    if (fetchError || !existingForm) {
      return NextResponse.json({ 
        error: 'Form not found' 
      }, { status: 404 });
    }
    
    if (existingForm.organization_id !== userWithOrg.organizationId) {
      return NextResponse.json({ 
        error: 'Unauthorized' 
      }, { status: 403 });
    }
    
    // Update the form
    const { id, ...updateData } = formData;
    const { data: updatedForm, error } = await supabase
      .from('forms')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating form:', error);
      return NextResponse.json({ 
        error: `Failed to update form: ${error.message}` 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      form: updatedForm
    });
    
  } catch (error: any) {
    console.error('Error in update form:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}