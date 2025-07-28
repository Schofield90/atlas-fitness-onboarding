import { NextRequest, NextResponse } from 'next/server'
import { logger } from '../lib/logger/logger'
import { performanceMonitor } from '../lib/monitoring/performance'

// List of routes to skip logging (sensitive data)
const SKIP_LOGGING_ROUTES = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/reset-password',
  '/api/payment' // Skip payment endpoints to avoid logging sensitive data
]

// List of routes to log minimal info only
const MINIMAL_LOGGING_ROUTES = [
  '/api/health',
  '/api/webhooks' // Webhooks might contain sensitive data
]

export async function withLogging(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const startTime = performance.now()
  const timer = performanceMonitor.startTimer('api.request', {
    method: request.method,
    path: request.nextUrl.pathname
  })
  
  // Generate request ID if not present
  const requestId = request.headers.get('x-request-id') || 
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // Clone headers to add request ID
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', requestId)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)
  requestHeaders.set('x-method', request.method)
  
  // Create new request with updated headers
  const newRequest = new NextRequest(request.url, {
    headers: requestHeaders,
    method: request.method,
    body: request.body
  })
  
  const shouldSkipLogging = SKIP_LOGGING_ROUTES.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  
  const shouldMinimalLog = MINIMAL_LOGGING_ROUTES.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )
  
  let response: NextResponse
  let error: Error | undefined
  
  try {
    // Call the actual handler
    response = await handler(newRequest)
    
    // Add request ID to response headers
    response.headers.set('x-request-id', requestId)
    
    return response
  } catch (err) {
    error = err instanceof Error ? err : new Error(String(err))
    
    // Create error response
    response = NextResponse.json(
      {
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred',
        requestId
      },
      { status: 500 }
    )
    
    response.headers.set('x-request-id', requestId)
    
    throw err
  } finally {
    const duration = performance.now() - startTime
    timer.end({
      statusCode: response?.status,
      error: error?.message
    })
    
    // Log the request unless it should be skipped
    if (!shouldSkipLogging) {
      try {
        // Prepare log context
        const logContext = {
          requestId,
          route: request.nextUrl.pathname,
          method: request.method,
          duration,
          statusCode: response?.status,
          userId: request.headers.get('x-user-id') || undefined,
          organizationId: request.headers.get('x-organization-id') || undefined,
          metadata: shouldMinimalLog ? {} : {
            query: Object.fromEntries(request.nextUrl.searchParams),
            userAgent: request.headers.get('user-agent'),
            referer: request.headers.get('referer'),
            ip: request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') ||
                'unknown'
          }
        }
        
        // Log based on response status
        if (error) {
          logger.error(
            `API Error: ${request.method} ${request.nextUrl.pathname}`,
            error,
            logContext
          )
        } else if (response.status >= 500) {
          logger.error(
            `API Server Error: ${request.method} ${request.nextUrl.pathname}`,
            undefined,
            logContext
          )
        } else if (response.status >= 400) {
          logger.warn(
            `API Client Error: ${request.method} ${request.nextUrl.pathname}`,
            logContext
          )
        } else if (duration > 1000) {
          // Log slow requests
          logger.warn(
            `Slow API Request: ${request.method} ${request.nextUrl.pathname} (${duration.toFixed(0)}ms)`,
            logContext
          )
        } else {
          logger.info(
            `API Request: ${request.method} ${request.nextUrl.pathname}`,
            logContext
          )
        }
      } catch (logError) {
        // Don't let logging errors break the request
        console.error('Logging error:', logError)
      }
    }
  }
}

// Helper to create logged API route handlers
export function createLoggedHandler(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => withLogging(req, handler)
}

// Example usage:
/*
// In your API route:
import { createLoggedHandler } from '@/app/middleware/logging-middleware'

export const GET = createLoggedHandler(async (request) => {
  // Your API logic here
  return NextResponse.json({ data: 'example' })
})
*/