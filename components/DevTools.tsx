'use client'

import { useState, useEffect } from 'react'
import { X, Bug, Database, Globe, Zap, AlertCircle } from 'lucide-react'
import { validateEnv, getAppUrl } from '@/lib/env-config'
import { devLog } from '@/lib/dev-utils'

export function DevTools() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'env' | 'api' | 'db' | 'perf'>('env')
  const [envStatus, setEnvStatus] = useState<{ missing: string[], warnings: string[] }>({ missing: [], warnings: [] })
  const [apiTests, setApiTests] = useState<Array<{ endpoint: string, status: number | null, time: number | null }>>([])
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }
  
  useEffect(() => {
    // Check environment variables
    const status = validateEnv()
    setEnvStatus(status)
    
    // Set up keyboard shortcut (Ctrl/Cmd + Shift + D)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  const testApi = async (endpoint: string) => {
    const startTime = Date.now()
    try {
      const response = await fetch(endpoint)
      const time = Date.now() - startTime
      
      setApiTests(prev => {
        const newTests = [...prev]
        const index = newTests.findIndex(t => t.endpoint === endpoint)
        if (index >= 0) {
          newTests[index] = { endpoint, status: response.status, time }
        } else {
          newTests.push({ endpoint, status: response.status, time })
        }
        return newTests
      })
    } catch (error) {
      const time = Date.now() - startTime
      setApiTests(prev => {
        const newTests = [...prev]
        const index = newTests.findIndex(t => t.endpoint === endpoint)
        if (index >= 0) {
          newTests[index] = { endpoint, status: null, time }
        } else {
          newTests.push({ endpoint, status: null, time })
        }
        return newTests
      })
    }
  }
  
  const commonEndpoints = [
    '/api/health',
    '/api/debug/knowledge',
    '/api/debug/test-supabase',
    '/api/debug/all-message-logs'
  ]
  
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors z-50"
        title="Open Dev Tools (Cmd+Shift+D)"
      >
        <Bug className="w-5 h-5" />
      </button>
    )
  }
  
  return (
    <div className="fixed bottom-0 right-0 w-96 h-[600px] bg-gray-900 text-white shadow-2xl rounded-tl-lg overflow-hidden z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between">
        <h3 className="font-bold text-lg">Dev Tools</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 hover:bg-gray-700 rounded"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('env')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'env' ? 'bg-gray-800 text-orange-500' : 'hover:bg-gray-800'
          }`}
        >
          Environment
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'api' ? 'bg-gray-800 text-orange-500' : 'hover:bg-gray-800'
          }`}
        >
          API Test
        </button>
        <button
          onClick={() => setActiveTab('db')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'db' ? 'bg-gray-800 text-orange-500' : 'hover:bg-gray-800'
          }`}
        >
          Database
        </button>
        <button
          onClick={() => setActiveTab('perf')}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'perf' ? 'bg-gray-800 text-orange-500' : 'hover:bg-gray-800'
          }`}
        >
          Performance
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'env' && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                Missing Variables ({envStatus.missing.length})
              </h4>
              {envStatus.missing.length === 0 ? (
                <p className="text-sm text-gray-400">All required variables are set!</p>
              ) : (
                <ul className="space-y-1">
                  {envStatus.missing.map(varName => (
                    <li key={varName} className="text-sm text-red-400">
                      • {varName}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                Optional Variables ({envStatus.warnings.length})
              </h4>
              {envStatus.warnings.length === 0 ? (
                <p className="text-sm text-gray-400">All optional variables are set!</p>
              ) : (
                <ul className="space-y-1">
                  {envStatus.warnings.map(varName => (
                    <li key={varName} className="text-sm text-yellow-400">
                      • {varName}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div>
              <h4 className="font-medium mb-2">App Info</h4>
              <p className="text-sm text-gray-400">
                URL: {getAppUrl()}
              </p>
              <p className="text-sm text-gray-400">
                Environment: {process.env.NODE_ENV}
              </p>
            </div>
          </div>
        )}
        
        {activeTab === 'api' && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Quick API Tests</h4>
              <div className="space-y-2">
                {commonEndpoints.map(endpoint => {
                  const test = apiTests.find(t => t.endpoint === endpoint)
                  return (
                    <div key={endpoint} className="flex items-center justify-between">
                      <span className="text-sm font-mono">{endpoint}</span>
                      <div className="flex items-center gap-2">
                        {test && (
                          <>
                            <span className={`text-xs ${
                              test.status === null ? 'text-red-500' :
                              test.status >= 200 && test.status < 300 ? 'text-green-500' :
                              'text-yellow-500'
                            }`}>
                              {test.status || 'Error'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {test.time}ms
                            </span>
                          </>
                        )}
                        <button
                          onClick={() => testApi(endpoint)}
                          className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded"
                        >
                          Test
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <button
              onClick={() => commonEndpoints.forEach(testApi)}
              className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded text-sm font-medium"
            >
              Test All Endpoints
            </button>
          </div>
        )}
        
        {activeTab === 'db' && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Database Shortcuts</h4>
              <div className="space-y-2">
                <a
                  href="/api/debug/check-tables"
                  target="_blank"
                  className="block px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm"
                >
                  Check Tables Structure
                </a>
                <a
                  href="/api/debug/check-rls"
                  target="_blank"
                  className="block px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm"
                >
                  Check RLS Policies
                </a>
                <a
                  href="/api/debug/test-insert"
                  target="_blank"
                  className="block px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm"
                >
                  Test Insert Operations
                </a>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'perf' && (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Performance Tips</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Use <code className="bg-gray-800 px-1 rounded">npm run dev:turbo</code> for faster HMR</li>
                <li>• Run <code className="bg-gray-800 px-1 rounded">npm run clean</code> if builds are slow</li>
                <li>• Use <code className="bg-gray-800 px-1 rounded">vercel dev</code> to test serverless functions</li>
                <li>• Check bundle size with <code className="bg-gray-800 px-1 rounded">npm run build:analyze</code></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Quick Actions</h4>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    devLog('Clearing Next.js cache...', undefined, 'info')
                    // In real app, you'd make an API call to trigger cache clear
                  }}
                  className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-left"
                >
                  Clear Next.js Cache
                </button>
                <button
                  onClick={() => {
                    localStorage.clear()
                    sessionStorage.clear()
                    devLog('Browser storage cleared!', undefined, 'success')
                  }}
                  className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm text-left"
                >
                  Clear Browser Storage
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}