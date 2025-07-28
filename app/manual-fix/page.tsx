'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ManualFixPage() {
  const [completed, setCompleted] = useState(false)
  const router = useRouter()

  const sqlCommand = `INSERT INTO users (
  id,
  email,
  name,
  organization_id,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  'ea1fc8e3-35a2-4c59-80af-5fde557391a1',
  'sam@atlas-gyms.co.uk',
  'Sam Schofield',
  '63589490-8f55-4157-bd3a-e141594b748e',
  'owner',
  true,
  NOW(),
  NOW()
);`

  const handleComplete = () => {
    setCompleted(true)
    setTimeout(() => {
      router.push('/leads')
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Manual Database Fix Instructions</h1>
        
        <div className="bg-red-900/20 border border-red-600 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-red-300 mb-3">The Problem</h2>
          <p className="text-red-200">
            Your auth user exists but there's no corresponding entry in the users table linking you to the Atlas Fitness organization.
          </p>
        </div>

        <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-blue-300 mb-4">Quick Fix Steps</h2>
          <ol className="space-y-4 text-blue-200">
            <li className="flex items-start">
              <span className="font-bold mr-2">1.</span>
              <div>
                <p>Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Supabase Dashboard</a></p>
              </div>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">2.</span>
              <div>
                <p>Navigate to <strong>SQL Editor</strong> (in the left sidebar)</p>
              </div>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">3.</span>
              <div>
                <p>Copy and paste this SQL command:</p>
                <div className="mt-2 bg-gray-800 rounded p-4 font-mono text-sm overflow-x-auto">
                  <pre>{sqlCommand}</pre>
                </div>
              </div>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">4.</span>
              <div>
                <p>Click <strong>Run</strong> (or press Cmd/Ctrl + Enter)</p>
              </div>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">5.</span>
              <div>
                <p>You should see "Success. No rows returned" - this is correct!</p>
              </div>
            </li>
          </ol>
        </div>

        <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-yellow-300 mb-3">Alternative: Table Editor Method</h2>
          <ol className="space-y-2 text-yellow-200">
            <li>1. Go to <strong>Table Editor</strong> → <strong>users</strong> table</li>
            <li>2. Click <strong>Insert row</strong></li>
            <li>3. Fill in these exact values:</li>
          </ol>
          <div className="mt-3 bg-gray-800 rounded p-4 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-gray-400">id:</div>
              <div className="font-mono text-yellow-300">ea1fc8e3-35a2-4c59-80af-5fde557391a1</div>
              <div className="text-gray-400">email:</div>
              <div className="font-mono text-yellow-300">sam@atlas-gyms.co.uk</div>
              <div className="text-gray-400">name:</div>
              <div className="font-mono text-yellow-300">Sam Schofield</div>
              <div className="text-gray-400">organization_id:</div>
              <div className="font-mono text-yellow-300">63589490-8f55-4157-bd3a-e141594b748e</div>
              <div className="text-gray-400">role:</div>
              <div className="font-mono text-yellow-300">owner</div>
              <div className="text-gray-400">is_active:</div>
              <div className="font-mono text-yellow-300">true</div>
            </div>
          </div>
        </div>

        {completed ? (
          <div className="bg-green-900/20 border border-green-600 rounded-lg p-6">
            <p className="text-green-300 text-lg">
              ✓ Great! Redirecting you to the leads page...
            </p>
          </div>
        ) : (
          <button
            onClick={handleComplete}
            className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-colors"
          >
            I've completed the manual fix - Take me to leads
          </button>
        )}
      </div>
    </div>
  )
}