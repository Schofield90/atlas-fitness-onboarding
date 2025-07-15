import { NextRequest } from 'next/server'
import { handleApiRoute, supabaseAdmin, validateRequestBody } from '@/lib/api/middleware'
import { organizationUpdateSchema } from '@/lib/validations/api'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    const { id: organizationId } = await params
    
    // Verify user belongs to this organization and has admin rights
    if (user.organization_id !== organizationId) {
      throw new Error('Access denied')
    }

    if (!['owner', 'admin'].includes(user.role)) {
      throw new Error('Insufficient permissions')
    }

    const body = await request.json()
    
    const { data: validatedData, error: validationError } = validateRequestBody(
      body,
      organizationUpdateSchema
    )

    if (validationError || !validatedData) {
      throw new Error(validationError || 'Invalid request body')
    }

    const organizationUpdateData = validatedData as any

    const { data: updatedOrganization, error } = await supabaseAdmin
      .from('organizations')
      .update(organizationUpdateData)
      .eq('id', organizationId)
      .select()
      .single()

    if (error) {
      throw new Error('Failed to update organization')
    }

    return updatedOrganization
  }, { allowedRoles: ['owner', 'admin'] })
}