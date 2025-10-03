'use client'

import { useEffect, useState } from 'react'

export function ToastProvider() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const { Toaster } = require('react-hot-toast')

  return (
    <Toaster 
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#1f2937',
          color: '#fff',
          borderRadius: '0.5rem',
          border: '1px solid #374151'
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff'
          }
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff'
          }
        }
      }}
    />
  )
}