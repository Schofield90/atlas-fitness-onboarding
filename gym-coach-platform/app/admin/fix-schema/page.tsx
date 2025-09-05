'use client'

import { useState } from 'react'
import Button from '@/app/components/ui/Button'

export default function FixSchemaPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const checkSchema = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/fix-booking-links-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        error: 'Failed to check schema',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('SQL copied to clipboard!')
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Fix Booking Links Schema</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <p className="text-gray-300 mb-4">
            This tool will check if the booking_links table has all required columns and provide
            the SQL migration script to fix any missing columns.
          </p>
          
          <Button
            onClick={checkSchema}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {loading ? 'Checking...' : 'Check Schema & Get Migration SQL'}
          </Button>
        </div>

        {result && (
          <div className="space-y-6">
            {result.error ? (
              <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
                <h3 className="text-red-400 font-semibold mb-2">Error</h3>
                <p className="text-red-300">{result.error}</p>
                {result.details && (
                  <p className="text-red-300 text-sm mt-2">{result.details}</p>
                )}
              </div>
            ) : (
              <>
                <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-4">
                  <h3 className="text-yellow-400 font-semibold mb-2">Schema Status</h3>
                  <p className="text-yellow-300 mb-4">{result.message}</p>
                  
                  {result.missing_columns && result.missing_columns.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-yellow-400 font-medium mb-2">Missing Columns:</h4>
                      <ul className="list-disc list-inside text-yellow-300 text-sm">
                        {result.missing_columns.map((col: string) => (
                          <li key={col}>{col}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.column_status && (
                    <div className="mb-4">
                      <h4 className="text-yellow-400 font-medium mb-2">Column Status:</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {result.column_status.map((status: any) => (
                          <div key={status.column} className={`flex items-center gap-2 ${
                            status.exists ? 'text-green-400' : 'text-red-400'
                          }`}>
                            <span className="w-2 h-2 rounded-full bg-current"></span>
                            {status.column}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {result.migration_sql && (
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-green-400 font-semibold">Migration SQL</h3>
                      <Button
                        onClick={() => copyToClipboard(result.migration_sql)}
                        variant="outline"
                        size="sm"
                      >
                        Copy SQL
                      </Button>
                    </div>
                    
                    <pre className="bg-gray-900 p-4 rounded text-sm overflow-x-auto text-gray-300">
                      <code>{result.migration_sql}</code>
                    </pre>
                  </div>
                )}

                {result.instructions && (
                  <div className="bg-blue-900/50 border border-blue-700 rounded-lg p-4">
                    <h3 className="text-blue-400 font-semibold mb-2">Instructions</h3>
                    <ol className="list-decimal list-inside text-blue-300 space-y-1">
                      {result.instructions.map((instruction: string, index: number) => (
                        <li key={index}>{instruction}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}