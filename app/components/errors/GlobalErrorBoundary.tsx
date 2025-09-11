'use client'

/**
 * Global Error Boundary Component
 * 
 * Application-wide error boundary that wraps the entire app and handles
 * critical errors, routing errors, and other app-level failures.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { AppError } from '@/app/lib/errors/error-classes'

interface GlobalErrorBoundaryProps {
  children: ReactNode
  userId?: string
  organizationId?: string
  userRole?: 'owner' | 'admin' | 'staff' | 'viewer' | 'client'
}

interface GlobalErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorId: string | null
}

export class GlobalErrorBoundary extends Component<GlobalErrorBoundaryProps, GlobalErrorBoundaryState> {
  constructor(props: GlobalErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorId: null
    }

    // Handle global unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection)
      
      // Handle global JavaScript errors that escape React
      window.addEventListener('error', this.handleGlobalError)
      
      // Handle resource loading errors
      window.addEventListener('error', this.handleResourceError, true)
    }
  }

  componentWillUnmount() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('unhandledrejection', this.handleUnhandledRejection)
      window.removeEventListener('error', this.handleGlobalError)
      window.removeEventListener('error', this.handleResourceError, true)
    }
  }

  static getDerivedStateFromError(error: Error): Partial<GlobalErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `global_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.group('🚨 Global Error Boundary Caught Critical Error')
    console.error('Error:', error)
    console.error('Error Info:', errorInfo)
    console.error('Component Stack:', errorInfo.componentStack)
    console.groupEnd()

    // Report critical app-level error
    this.reportCriticalError(error, errorInfo, 'react_component')
    
    // In production, you might want to refresh the page after a delay
    // to recover from critical errors
    if (process.env.NODE_ENV === 'production') {
      setTimeout(() => {
        if (confirm('The application encountered a critical error. Would you like to refresh the page to recover?')) {
          window.location.reload()
        }
      }, 2000)
    }
  }

  /**
   * Handle unhandled promise rejections
   */
  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    console.error('Unhandled Promise Rejection:', event.reason)
    
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
    this.reportCriticalError(error, null, 'unhandled_promise')
    
    // Prevent the default browser behavior (logging to console)
    event.preventDefault()
  }

  /**
   * Handle global JavaScript errors
   */
  private handleGlobalError = (event: ErrorEvent) => {
    console.error('Global JavaScript Error:', event.error || event.message)
    
    const error = event.error || new Error(event.message)
    this.reportCriticalError(error, null, 'global_javascript')
  }

  /**
   * Handle resource loading errors
   */
  private handleResourceError = (event: ErrorEvent) => {
    const target = event.target as HTMLElement
    
    if (target && target !== window) {
      const resourceType = target.tagName?.toLowerCase() || 'unknown'
      const resourceUrl = (target as any).src || (target as any).href || 'unknown'
      
      console.error(`Resource loading error (${resourceType}):`, resourceUrl)
      
      const error = new Error(`Failed to load ${resourceType}: ${resourceUrl}`)
      this.reportCriticalError(error, null, 'resource_loading')
    }
  }

  // Client-side rate limiting
  private static errorReportCount = 0;
  private static errorReportResetTime = Date.now() + 3600000; // 1 hour
  private static MAX_ERROR_REPORTS = 10; // Max 10 reports per hour

  /**
   * Report critical errors to monitoring system
   */
  private reportCriticalError = async (
    error: Error, 
    errorInfo: ErrorInfo | null, 
    category: string
  ) => {
    try {
      // Skip reporting if it's an error from the error reporting endpoint itself
      if (error.message?.includes('/api/errors/report') || 
          error.message?.includes('Too many error reports')) {
        console.warn('Skipping error report to prevent loop')
        return
      }

      // Client-side rate limiting
      const now = Date.now()
      if (now > GlobalErrorBoundary.errorReportResetTime) {
        GlobalErrorBoundary.errorReportCount = 0
        GlobalErrorBoundary.errorReportResetTime = now + 3600000
      }

      if (GlobalErrorBoundary.errorReportCount >= GlobalErrorBoundary.MAX_ERROR_REPORTS) {
        console.warn('Client-side error report rate limit reached')
        return
      }

      GlobalErrorBoundary.errorReportCount++

      const errorReport = {
        message: error.message,
        stack: error.stack || errorInfo?.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        severity: 'critical' as const,
        category: category,
        component: 'GlobalErrorBoundary',
        userId: this.props.userId,
        organizationId: this.props.organizationId,
        metadata: {
          userRole: this.props.userRole,
          pathname: window.location.pathname,
          search: window.location.search,
          referrer: document.referrer,
          errorInfo: errorInfo ? {
            componentStack: errorInfo.componentStack
          } : null
        }
      }

      // Send to error reporting API
      const response = await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorReport)
      })

      // Don't throw on 4xx errors to prevent loops
      if (response.status >= 400 && response.status < 500) {
        console.warn('Error report rejected:', response.status)
        return
      }
    } catch (reportingError) {
      // Never let error reporting itself cause an error
      console.error('Failed to report critical error:', reportingError)
    }
  }

  /**
   * Recovery actions for critical errors
   */
  private handleRecoveryAction = (action: string) => {
    switch (action) {
      case 'refresh':
        window.location.reload()
        break
      
      case 'home':
        window.location.href = '/'
        break
        
      case 'login':
        window.location.href = '/login'
        break
        
      case 'contact_support':
        if (process.env.NEXT_PUBLIC_SUPPORT_EMAIL) {
          window.location.href = `mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}?subject=Critical Error Report&body=Error ID: ${this.state.errorId}`
        }
        break
        
      default:
        console.log('Unknown recovery action:', action)
    }
  }

  render() {
    const { hasError, error, errorId } = this.state
    const { children } = this.props

    if (hasError && error) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                {/* Error Icon */}
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                  <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" 
                    />
                  </svg>
                </div>

                {/* Error Title */}
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Application Error
                </h1>

                {/* Error Message */}
                <p className="text-gray-600 mb-6">
                  The application encountered a critical error and needs to be restarted. 
                  Our team has been automatically notified.
                </p>

                {/* Error Details (Development Only) */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mb-6 p-4 bg-gray-100 rounded-lg text-left">
                    <h3 className="font-semibold text-gray-800 mb-2">Error Details:</h3>
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                      {error.message}
                      {error.stack && '\n\n' + error.stack}
                    </pre>
                  </div>
                )}

                {/* Recovery Actions */}
                <div className="space-y-3">
                  <button
                    onClick={() => this.handleRecoveryAction('refresh')}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Reload Application
                  </button>

                  <button
                    onClick={() => this.handleRecoveryAction('home')}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Go to Homepage
                  </button>

                  {process.env.NEXT_PUBLIC_SUPPORT_EMAIL && (
                    <button
                      onClick={() => this.handleRecoveryAction('contact_support')}
                      className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Contact Support
                    </button>
                  )}
                </div>

                {/* Error ID for Support */}
                {errorId && (
                  <div className="mt-6 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">
                      Error Reference: <span className="font-mono">{errorId}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Please include this reference when contacting support
                    </p>
                  </div>
                )}

                {/* Additional Help */}
                <div className="mt-6 text-sm text-gray-500">
                  <p>
                    If this problem persists, please{' '}
                    <a 
                      href={process.env.NEXT_PUBLIC_SUPPORT_URL || '/contact'} 
                      className="text-indigo-600 hover:text-indigo-500"
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      contact our support team
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Bar */}
          <div className="mt-8 text-center">
            <a 
              href={process.env.NEXT_PUBLIC_STATUS_URL || '/status'} 
              className="text-sm text-gray-400 hover:text-gray-500"
              target="_blank" 
              rel="noopener noreferrer"
            >
              Check System Status
            </a>
          </div>
        </div>
      )
    }

    // Wrap children in nested error boundaries for different levels
    return (
      <ErrorBoundary
        level="page"
        componentName="App"
        userRole={this.props.userRole}
        userId={this.props.userId}
        organizationId={this.props.organizationId}
        reportErrors={true}
        onError={(error, errorInfo) => {
          // Log page-level errors but don't trigger global fallback
          console.error('Page-level error caught by nested boundary:', error)
        }}
      >
        {children}
      </ErrorBoundary>
    )
  }
}

// Provider component to inject error boundary into app
export function ErrorBoundaryProvider({ 
  children, 
  userId, 
  organizationId, 
  userRole 
}: {
  children: ReactNode
  userId?: string
  organizationId?: string
  userRole?: 'owner' | 'admin' | 'staff' | 'viewer' | 'client'
}) {
  return (
    <GlobalErrorBoundary
      userId={userId}
      organizationId={organizationId}
      userRole={userRole}
    >
      {children}
    </GlobalErrorBoundary>
  )
}