import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { requireAuth } from '@/app/lib/api/auth-check';

export async function DELETE(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth();
    const supabase = createAdminClient();
    
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get('id');
    
    if (!formId) {
      return NextResponse.json({ 
        error: 'Form ID is required' 
      }, { status: 400 });
    }
    
    // Ensure the form belongs to the user's organization
    const { data: existingForm, error: fetchError } = await supabase
      .from('forms')
      .select('organization_id')
      .eq('id', formId)
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
    
    // Delete the form
    const { error } = await supabase
      .from('forms')
      .delete()
      .eq('id', formId);
    
    if (error) {
      console.error('Error deleting form:', error);
      return NextResponse.json({ 
        error: `Failed to delete form: ${error.message}` 
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Form deleted successfully'
    });
    
  } catch (error: any) {
    console.error('Error in delete form:', error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 });
  }
}