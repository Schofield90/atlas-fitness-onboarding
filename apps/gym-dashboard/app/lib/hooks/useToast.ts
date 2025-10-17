'use client'

import { useEffect, useState } from 'react'

export function useToast() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    if (!mounted) return
    
    // Simple toast implementation without react-hot-toast for SSR compatibility
    if (typeof window !== 'undefined') {
      // For now, use console and could be replaced with a custom toast later
      console.log(`[${type.toUpperCase()}]`, message)
      
      // You could also dispatch a custom event here for a toast component to listen to
      window.dispatchEvent(new CustomEvent('toast', { 
        detail: { message, type } 
      }))
    }
  }

  return {
    success: (message: string) => showToast(message, 'success'),
    error: (message: string) => showToast(message, 'error'),
    info: (message: string) => showToast(message, 'info'),
  }
}