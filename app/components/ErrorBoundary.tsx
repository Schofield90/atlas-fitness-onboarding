'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  componentName?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error in ${this.props.componentName || 'component'}:`, error, errorInfo)
    this.setState({ error, errorInfo })
    
    // Log to error reporting service
    if (typeof window !== 'undefined') {
      fetch('/api/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: error.toString(),
          errorInfo: errorInfo.componentStack,
          component: this.props.componentName,
          url: window.location.href,
          timestamp: new Date().toISOString()
        })
      }).catch(err => console.error('Failed to report error:', err))
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <AlertTriangle className="w-12 h-12 text-red-600 dark:text-red-400 mb-4" />
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
            Something went wrong
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300 text-center mb-4">
            {this.props.componentName 
              ? `An error occurred in the ${this.props.componentName} component.`
              : 'An unexpected error occurred.'}
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4 w-full">
              <summary className="cursor-pointer text-sm text-red-600 dark:text-red-400 hover:underline">
                Show error details
              </summary>
              <pre className="mt-2 p-4 bg-red-100 dark:bg-red-900/40 rounded text-xs overflow-auto">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}