'use client'

import DashboardLayout from '@/app/components/DashboardLayout'
import { useState, useEffect } from 'react'

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [userData, setUserData] = useState(null)

  useEffect(() => {
    // Get trial data from localStorage after component mounts
    const trialData = localStorage.getItem('gymleadhub_trial_data')
    if (trialData) {
      setUserData(JSON.parse(trialData))
    }
  }, [])

  return (
    <DashboardLayout userData={userData}>
      {children}
    </DashboardLayout>
  )
}