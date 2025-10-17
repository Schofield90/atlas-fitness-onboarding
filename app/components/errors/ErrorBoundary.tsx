'use client'

/**
 * React Error Boundary Component
 * 
 * Comprehensive error boundary for Atlas Fitness CRM that catches JavaScript errors
 * in React components, logs them, and displays user-friendly fallback UI.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AppError } from '@/app/lib/errors/error-classes'
import { getUserFriendlyMessage, UserRole } from '@/app/lib/errors/user-friendly-messages'

// Error boundary props
interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode | ((error: Error, errorInfo: ErrorInfo) => ReactNode)
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  userRole?: UserRole
  organizationId?: string
  userId?: string
  reportErrors?: boolean
  showErrorDetails?: boolean
  level?: 'page' | 'component' | 'section'
  componentName?: string
  resetKeys?: Array<string | number | boolean | null | undefined>
}

// Error boundary state
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string | null
  retryCount: number
}

// Error report payload for client-side reporting
interface ErrorReport {
  message: string
  stack?: string
  url: string
  lineNumber?: number
  columnNumber?: number
  userAgent: string
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'javascript' | 'network' | 'ui' | 'performance' | 'security'
  component?: string
  props?: Record<string, any>
  userId?: string
  organizationId?: string
  sessionId?: string
  metadata?: Record<string, any>
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: NodeJS.Timeout | null = null

  constructor(props: ErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: ErrorBoundary.generateErrorId()
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Update state with error info
    this.setState({
      errorInfo
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 React Error Boundary Caught Error')
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.error('Component Stack:', errorInfo.componentStack)
      console.groupEnd()
    }

    // Report error to monitoring if enabled
    if (this.props.reportErrors !== false) {
      this.reportError(error, errorInfo)
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys } = this.props
    const { hasError } = this.state

    // Reset error state if resetKeys change
    if (hasError && resetKeys !== prevProps.resetKeys) {
      if (resetKeys?.some((key, index) => key !== prevProps.resetKeys?.[index])) {
        this.resetError()
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId)
    }
  }

  /**
   * Generate unique error ID for tracking
   */
  private static generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Reset error state
   */
  private resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    })
  }

  /**
   * Retry with error recovery
   */
  private retryWithRecovery = (): void => {
    const { retryCount } = this.state
    const maxRetries = 3

    if (retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        retryCount: prevState.retryCount + 1
      }))

      // Auto-reset after a delay to prevent rapid retries
      this.resetTimeoutId = setTimeout(() => {
        if (this.state.hasError) {
          this.resetError()
        }
      }, 5000)
    }
  }

  /**
   * Report error to monitoring system
   */
  private reportError = async (error: Error, errorInfo: ErrorInfo): Promise<void> => {
    try {
      // Extract error details
      const stack = error.stack || errorInfo.componentStack
      const errorReport: ErrorReport = {
        message: error.message,
        stack,
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        timestamp: new Date().toISOString(),
        severity: this.determineSeverity(error, errorInfo),
        category: 'javascript',
        component: this.props.componentName || this.extractComponentName(errorInfo),
        userId: this.props.userId,
        organizationId: this.props.organizationId,
        sessionId: this.getSessionId(),
        metadata: {
          level: this.props.level || 'component',
          retryCount: this.state.retryCount,
          errorBoundaryProps: {
            componentName: this.props.componentName,
            level: this.props.level,
            resetKeys: this.props.resetKeys
          },
          errorInfo: {
            componentStack: errorInfo.componentStack
          }
        }
      }

      // Send to error reporting API
      await fetch('/api/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorReport)
      })
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  /**
   * Determine error severity
   */
  private determineSeverity(error: Error, errorInfo: ErrorInfo): 'low' | 'medium' | 'high' | 'critical' {
    const { level } = this.props
    const message = error.message.toLowerCase()
    const stack = error.stack?.toLowerCase() || ''

    // Critical errors
    if (level === 'page' || message.includes('chunk') || message.includes('network')) {
      return 'critical'
    }

    // High severity errors
    if (message.includes('permission') || message.includes('unauthorized') || stack.includes('auth')) {
      return 'high'
    }

    // Medium severity for most component errors
    if (level === 'section') {
      return 'medium'
    }

    // Low severity for minor component issues
    return 'low'
  }

  /**
   * Extract component name from error info
   */
  private extractComponentName(errorInfo: ErrorInfo): string {
    const componentStack = errorInfo.componentStack
    const match = componentStack.match(/^\s*in (\w+)/)
    return match ? match[1] : 'Unknown'
  }

  /**
   * Get session ID from storage or generate one
   */
  private getSessionId(): string {
    if (typeof window === 'undefined') return 'server'
    
    let sessionId = sessionStorage.getItem('error-session-id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('error-session-id', sessionId)
    }
    return sessionId
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyError(): { title: string; message: string } {
    const { error } = this.state
    const { userRole = 'staff' } = this.props

    if (!error) {
      return {
        title: 'Something went wrong',
        message: 'An unexpected error occurred. Please try again.'
      }
    }

    // Convert to AppError for consistent messaging
    const appError = new AppError(
      error.message,
      500,
      'REACT_ERROR',
      true,
      {
        componentStack: this.state.errorInfo?.componentStack,
        level: this.props.level,
        componentName: this.props.componentName
      }
    )

    const friendlyMessage = getUserFriendlyMessage(appError, userRole)
    return {
      title: friendlyMessage.title,
      message: friendlyMessage.message
    }
  }

  render() {
    const { hasError, error, errorId, retryCount } = this.state
    const { children, fallback, showErrorDetails = false, level = 'component' } = this.props

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(error, this.state.errorInfo!)
        }
        return fallback
      }

      // Default fallback UI based on level
      return this.renderDefaultFallback(level, error, errorId, retryCount, showErrorDetails)
    }

    return children
  }

  /**
   * Render default fallback UI
   */
  private renderDefaultFallback(
    level: string,
    error: Error,
    errorId: string | null,
    retryCount: number,
    showErrorDetails: boolean
  ): ReactNode {
    const { title, message } = this.getUserFriendlyError()
    const canRetry = retryCount < 3

    // Page-level error (full page fallback)
    if (level === 'page') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <h1 className="text-xl font-semibold text-gray-900 mb-2">{title}</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              
              <div className="space-y-3">
                {canRetry && (
                  <button
                    onClick={this.retryWithRecovery}
                    className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    Try Again {retryCount > 0 && `(${retryCount}/3)`}
                  </button>
                )}
                
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Refresh Page
                </button>
              </div>
              
              {errorId && (
                <p className="text-xs text-gray-500 mt-4">
                  Error ID: {errorId}
                </p>
              )}
            </div>
          </div>
        </div>
      )
    }

    // Section-level error (larger component fallback)
    if (level === 'section') {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">{title}</h3>
              <p className="text-sm text-red-700 mt-1">{message}</p>
              
              {canRetry && (
                <div className="mt-4">
                  <button
                    onClick={this.retryWithRecovery}
                    className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    Try Again {retryCount > 0 && `(${retryCount}/3)`}
                  </button>
                </div>
              )}
              
              {showErrorDetails && (
                <details className="mt-4">
                  <summary className="text-sm text-red-600 cursor-pointer">Technical Details</summary>
                  <pre className="text-xs text-red-700 mt-2 bg-red-100 p-2 rounded overflow-auto">
                    {error.message}
                    {error.stack && '\n\n' + error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )
    }

    // Component-level error (inline fallback)
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 m-2">
        <div className="flex items-center">
          <svg className="h-4 w-4 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm text-yellow-800">Component failed to load</span>
          
          {canRetry && (
            <button
              onClick={this.retryWithRecovery}
              className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded hover:bg-yellow-200 focus:outline-none"
            >
              Retry
            </button>
          )}
        </div>
        
        {showErrorDetails && (
          <div className="mt-2 text-xs text-yellow-700">
            {error.message}
          </div>
        )}
      </div>
    )
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}

// Hook for manually reporting errors
export function useErrorReporting() {
  const reportError = async (error: Error | string, metadata?: Record<string, any>) => {
    try {
      const errorReport: Partial<ErrorReport> = {
        message: typeof error === 'string' ? error : error.message,
        stack: typeof error === 'string' ? undefined : error.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        severity: 'medium',
        category: 'javascript',
        metadata
      }

      await fetch('/api/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorReport)
      })
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError)
    }
  }

  return { reportError }
}