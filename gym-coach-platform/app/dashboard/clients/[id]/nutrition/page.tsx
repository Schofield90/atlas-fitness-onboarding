'use client'

import { useRouter } from 'next/navigation'
import ClientNutritionCoach from '@/components/ClientNutritionCoach'

export default function ClientNutritionPage({ params }: { params: { id: string } }) {
  const router = useRouter()

  const handleBack = () => {
    router.push(`/dashboard/clients/${params.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <ClientNutritionCoach 
        clientId={params.id} 
        onBack={handleBack}
      />
    </div>
  )
}