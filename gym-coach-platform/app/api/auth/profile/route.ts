import { NextRequest } from 'next/server'
import { handleApiRoute, supabaseAdmin, validateRequestBody } from '@/lib/api/middleware'
import { z } from 'zod'

const profileUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  avatar_url: z.string().url().optional(),
  settings: z.record(z.any()).optional()
})

export async function PUT(request: NextRequest) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    const body = await request.json()
    
    const { data: validatedData, error: validationError } = validateRequestBody(
      body,
      profileUpdateSchema
    )

    if (validationError) {
      throw new Error(validationError)
    }

    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update(validatedData)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      throw new Error('Failed to update profile')
    }

    return updatedUser
  })
}