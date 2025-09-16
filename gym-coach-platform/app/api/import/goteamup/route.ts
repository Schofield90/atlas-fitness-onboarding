import { NextRequest, NextResponse } from 'next/server'
import { GoTeamUpImporter, ImportProgress, ImportResult } from '@/lib/services/goteamup-import'
import { handleApiRoute, AuthenticatedRequest } from '@/lib/api/middleware'

// Store for SSE connections
const connections = new Map<string, Response>()

async function handleImport(request: AuthenticatedRequest) {
  const organizationId = request.user.organization_id

  const formData = await request.formData()
  const file = formData.get('file') as File
  const importType = formData.get('type') as string
  const connectionId = formData.get('connectionId') as string

  if (!file) {
    throw new Error('No file provided')
  }

  if (!file.name.endsWith('.csv')) {
    throw new Error('Only CSV files are supported')
  }

  const csvContent = await file.text()

  // Auto-detect file type if not provided
  const detectedType = importType || GoTeamUpImporter.detectFileType(csvContent)

  if (detectedType === 'unknown') {
    throw new Error('Unable to detect file type. Please ensure your CSV has the correct headers for payments or attendance data.')
  }

  // Create importer with progress callback
  const importer = new GoTeamUpImporter(
    organizationId,
    (progress: ImportProgress) => {
      // Send progress via SSE if connection exists
      if (connectionId && connections.has(connectionId)) {
        const response = connections.get(connectionId)!
        const encoder = new TextEncoder()
        const writer = response.body?.getWriter()

        writer?.write(encoder.encode(`data: ${JSON.stringify({
          type: 'progress',
          progress
        })}\n\n`))
      }
    }
  )

  let result: ImportResult

  if (detectedType === 'payments') {
    result = await importer.importPayments(csvContent)
  } else if (detectedType === 'attendance') {
    result = await importer.importAttendance(csvContent)
  } else {
    throw new Error(`Unsupported import type: ${detectedType}`)
  }

  // Send completion via SSE if connection exists
  if (connectionId && connections.has(connectionId)) {
    const response = connections.get(connectionId)!
    const encoder = new TextEncoder()
    const writer = response.body?.getWriter()

    writer?.write(encoder.encode(`data: ${JSON.stringify({
      type: 'complete',
      result
    })}\n\n`))

    writer?.close()
    connections.delete(connectionId)
  }

  return {
    success: true,
    type: detectedType,
    result
  }
}

export async function POST(request: NextRequest) {
  return handleApiRoute(request, handleImport, {
    requireAuth: true,
    allowedRoles: ['owner', 'admin'],
    rateLimit: true
  })
}

// SSE endpoint for real-time progress updates
async function handleSSE(request: AuthenticatedRequest) {
  const { searchParams } = new URL(request.url)
  const connectionId = searchParams.get('connectionId')

  if (!connectionId) {
    throw new Error('Connection ID required')
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'connected',
        connectionId
      })}\n\n`))

      // Store the connection for progress updates
      connections.set(connectionId, new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      }))

      // Clean up on disconnect
      const cleanup = () => {
        connections.delete(connectionId)
        controller.close()
      }

      // Auto cleanup after 10 minutes
      const timeout = setTimeout(cleanup, 10 * 60 * 1000)

      // Store cleanup function
      ;(controller as any).cleanup = () => {
        clearTimeout(timeout)
        cleanup()
      }
    },
    cancel() {
      if (connectionId && connections.has(connectionId)) {
        connections.delete(connectionId)
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function GET(request: NextRequest) {
  return handleApiRoute(request, handleSSE, {
    requireAuth: true,
    allowedRoles: ['owner', 'admin']
  })
}