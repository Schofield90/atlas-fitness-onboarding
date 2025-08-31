'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  onReset?: () => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ConfigPanelErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Config panel error:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-gray-900 border border-red-500 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">
                Configuration Panel Error
              </h3>
              <p className="text-gray-300 mb-2">
                Unable to load the configuration panel for this node.
              </p>
              {this.state.error && (
                <details className="mb-4">
                  <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                    Error details
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-800 rounded text-xs text-gray-400 overflow-auto">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
              <button
                onClick={this.handleReset}
                className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Reset Panel
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}