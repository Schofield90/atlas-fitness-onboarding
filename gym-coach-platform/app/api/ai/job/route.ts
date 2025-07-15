import { NextRequest } from 'next/server'
import { handleApiRoute } from '@/lib/api/middleware'
import { getQualificationJob, startQualificationJob, stopQualificationJob, runManualQualificationCycle } from '@/lib/jobs/lead-qualification-job'

export async function GET(request: NextRequest) {
  return handleApiRoute(request, async (req) => {
    const job = getQualificationJob()
    return job.getStatus()
  }, { allowedRoles: ['owner', 'admin'] })
}

export async function POST(request: NextRequest) {
  return handleApiRoute(request, async (req) => {
    const { user } = req
    const body = await request.json()
    const { action, config } = body

    switch (action) {
      case 'start':
        startQualificationJob(config)
        return { message: 'Lead qualification job started', status: getQualificationJob().getStatus() }

      case 'stop':
        stopQualificationJob()
        return { message: 'Lead qualification job stopped' }

      case 'restart':
        stopQualificationJob()
        startQualificationJob(config)
        return { message: 'Lead qualification job restarted', status: getQualificationJob().getStatus() }

      case 'run_manual':
        const result = await runManualQualificationCycle(user.organization_id)
        return { message: 'Manual qualification cycle completed', result }

      case 'update_config':
        if (!config) {
          throw new Error('Config is required for update_config action')
        }
        const job = getQualificationJob()
        job.updateConfig(config)
        return { message: 'Job configuration updated', status: job.getStatus() }

      default:
        throw new Error('Invalid action. Use: start, stop, restart, run_manual, or update_config')
    }
  }, { allowedRoles: ['owner', 'admin'] })
}