'use client'

/**
 * Async Error Boundary Component
 * 
 * Specialized error boundary for handling async operations and API calls
 * with loading states, retry mechanisms, and fallback UI.
 */

import React, { Component, ReactNode, Suspense } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { AppError, IntegrationError } from '@/app/lib/errors/error-classes'
import { withRetry } from '@/app/lib/errors/error-recovery'

interface AsyncErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  loadingFallback?: ReactNode
  onError?: (error: Error) => void
  onRetry?: () => void
  retryable?: boolean
  maxRetries?: number
  componentName?: string
  operationName?: string
  dependencies?: Array<string | number | boolean | null | undefined>
}

interface AsyncErrorBoundaryState {
  hasError: boolean
  isLoading: boolean
  error: Error | null
  retryCount: number
  lastRetryTime: number | null
}

export class AsyncErrorBoundary extends Component<AsyncErrorBoundaryProps, AsyncErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null
  private abortController: AbortController | null = null

  constructor(props: AsyncErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      isLoading: false,
      error: null,
      retryCount: 0,
      lastRetryTime: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<AsyncErrorBoundaryState> {
    return {
      hasError: true,
      isLoading: false,
      error
    }
  }

  componentDidCatch(error: Error) {
    if (this.props.onError) {
      this.props.onError(error)
    }

    // Log async error with additional context
    console.error(`Async Error Boundary caught error in ${this.props.componentName || 'Unknown'}:`, {
      error: error.message,
      operationName: this.props.operationName,
      retryCount: this.state.retryCount,
      stack: error.stack
    })
  }

  componentDidUpdate(prevProps: AsyncErrorBoundaryProps) {
    // Reset error state if dependencies change
    if (this.props.dependencies !== prevProps.dependencies) {
      if (this.props.dependencies?.some((dep, index) => dep !== prevProps.dependencies?.[index])) {
        this.resetError()
      }
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
    if (this.abortController) {
      this.abortController.abort()
    }
  }

  /**
   * Reset error state
   */
  private resetError = (): void => {
    if (this.abortController) {
      this.abortController.abort()
    }
    
    this.setState({
      hasError: false,
      isLoading: false,
      error: null,
      retryCount: 0,
      lastRetryTime: null
    })
  }

  /**
   * Retry the failed operation
   */
  private retryOperation = async (): Promise<void> => {
    const { maxRetries = 3, onRetry } = this.props
    const { retryCount } = this.state

    if (retryCount >= maxRetries) {
      return
    }

    // Set loading state
    this.setState({
      isLoading: true,
      lastRetryTime: Date.now(),
      retryCount: retryCount + 1
    })

    try {
      // Create new abort controller for retry
      this.abortController = new AbortController()

      // Call custom retry handler if provided
      if (onRetry) {
        await onRetry()
      }

      // Reset error state on successful retry
      this.setState({
        hasError: false,
        isLoading: false,
        error: null
      })
    } catch (retryError) {
      // If retry fails, update error state
      this.setState({
        hasError: true,
        isLoading: false,
        error: retryError instanceof Error ? retryError : new Error(String(retryError))
      })
    }
  }

  /**
   * Retry with exponential backoff
   */
  private retryWithBackoff = (): void => {
    const { retryCount } = this.state
    const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000) // Max 10 seconds
    
    this.retryTimeoutId = setTimeout(this.retryOperation, backoffDelay)
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    if (this.props.retryable === false) return false
    if (this.props.retryable === true) return true

    // Default retryable logic
    if (error instanceof IntegrationError) {
      return error.retryable !== false
    }

    // Check error message for retryable patterns
    const message = error.message.toLowerCase()
    return message.includes('network') ||
           message.includes('timeout') ||
           message.includes('fetch') ||
           message.includes('500') ||
           message.includes('503') ||
           message.includes('504')
  }

  render() {
    const { 
      children, 
      fallback, 
      loadingFallback,
      maxRetries = 3,
      componentName = 'Async Component'
    } = this.props
    
    const { hasError, isLoading, error, retryCount } = this.state

    // Show loading state
    if (isLoading) {
      if (loadingFallback) {
        return loadingFallback
      }
      
      return (
        <div className="flex items-center justify-center p-8">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
            <span className="text-sm text-gray-600">
              {retryCount > 0 ? `Retrying... (${retryCount}/${maxRetries})` : 'Loading...'}
            </span>
          </div>
        </div>
      )
    }

    // Show error state
    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback
      }

      const canRetry = retryCount < maxRetries && this.isRetryableError(error)
      const isIntegrationError = error instanceof IntegrationError

      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-2">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path 
                  fillRule="evenodd" 
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
                  clipRule="evenodd" 
                />
              </svg>
            </div>
            
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                {isIntegrationError ? 'Service Unavailable' : `Error in ${componentName}`}
              </h3>
              
              <div className="text-sm text-red-700 mt-1">
                <p>
                  {isIntegrationError 
                    ? 'A service is temporarily unavailable. This is usually temporary.'
                    : error.message || 'An unexpected error occurred while loading this component.'
                  }
                </p>
                
                {retryCount > 0 && (
                  <p className="mt-1 text-xs">
                    Retry attempt {retryCount} of {maxRetries}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex space-x-2">
                {canRetry && (
                  <button
                    onClick={this.retryOperation}
                    className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    Try Again
                  </button>
                )}
                
                {canRetry && this.isRetryableError(error) && (
                  <button
                    onClick={this.retryWithBackoff}
                    className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    Retry with Delay
                  </button>
                )}
                
                <button
                  onClick={this.resetError}
                  className="text-sm bg-gray-100 text-gray-800 px-3 py-1 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Reset
                </button>
              </div>

              {/* Technical Details (Development) */}
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4">
                  <summary className="text-sm text-red-600 cursor-pointer">
                    Technical Details
                  </summary>
                  <pre className="text-xs text-red-700 mt-2 bg-red-100 p-2 rounded overflow-auto max-h-32">
                    {error.stack || error.message}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )
    }

    // Wrap children in Suspense for async loading
    return (
      <ErrorBoundary
        level="component"
        componentName={componentName}
        reportErrors={true}
        fallback={(error, errorInfo) => (
          <AsyncErrorBoundary
            {...this.props}
            onError={this.props.onError}
          >
            <div>Error in {componentName}</div>
          </AsyncErrorBoundary>
        )}
      >
        <Suspense
          fallback={loadingFallback || (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
              <span className="text-sm text-gray-600">Loading {componentName}...</span>
            </div>
          )}
        >
          {children}
        </Suspense>
      </ErrorBoundary>
    )
  }
}

// Hook for handling async operations with error boundaries
export function useAsyncOperation<T>(
  operation: () => Promise<T>,
  dependencies: React.DependencyList = [],
  options: {
    onError?: (error: Error) => void
    onSuccess?: (result: T) => void
    retryCount?: number
  } = {}
) {
  const [state, setState] = React.useState<{
    data: T | null
    error: Error | null
    isLoading: boolean
  }>({
    data: null,
    error: null,
    isLoading: false
  })

  const executeOperation = React.useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const result = await withRetry(operation, {
        maxAttempts: options.retryCount || 3,
        retryCondition: (error) => {
          // Don't retry validation or auth errors
          return !(error instanceof AppError && error.statusCode < 500)
        }
      })
      
      setState({ data: result, error: null, isLoading: false })
      
      if (options.onSuccess) {
        options.onSuccess(result)
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      setState({ data: null, error: err, isLoading: false })
      
      if (options.onError) {
        options.onError(err)
      }
    }
  }, dependencies)

  React.useEffect(() => {
    executeOperation()
  }, dependencies)

  return {
    ...state,
    retry: executeOperation
  }
}

// Higher-order component for async error boundaries
export function withAsyncErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<AsyncErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <AsyncErrorBoundary {...options}>
      <Component {...props} />
    </AsyncErrorBoundary>
  )
  
  WrappedComponent.displayName = `withAsyncErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}