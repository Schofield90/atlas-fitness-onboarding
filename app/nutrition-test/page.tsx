'use client'

import { useEffect, useState } from 'react'
import NutritionDashboard from '@/app/components/nutrition/NutritionDashboard'

// Mock client data for testing
const mockClient = {
  id: 'test-client-id',
  first_name: 'Test',
  last_name: 'User',
  email: 'test@example.com',
  organization_id: 'test-org-id'
}

export default function NutritionTestPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Nutrition Test Page</h1>
        <NutritionDashboard client={mockClient} />
      </div>
    </div>
  )
}