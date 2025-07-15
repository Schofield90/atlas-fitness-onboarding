import { NextRequest } from 'next/server'
import { handleApiRoute } from '@/lib/api/middleware'
import { DatabaseService } from '@/lib/api/database'

export async function GET(request: NextRequest) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    
    try {
      const metrics = await DatabaseService.getOrganizationMetrics(user.organization_id)
      return metrics
    } catch (error) {
      throw new Error('Failed to fetch dashboard metrics')
    }
  })
}