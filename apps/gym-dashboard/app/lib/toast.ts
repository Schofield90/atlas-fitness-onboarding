/**
 * Simple toast notification utility
 * Provides consistent error and success messaging
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning'

/**
 * Extract error message from various error response formats
 */
export function extractErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  // Handle structured error response from our error handler
  if (error?.error) {
    if (typeof error.error === 'string') {
      return error.error
    }
    return error.error.userMessage || error.error.message || 'An error occurred'
  }
  
  // Handle direct message properties
  if (error?.message) {
    return error.message
  }
  
  // Handle userMessage property
  if (error?.userMessage) {
    return error.userMessage
  }
  
  // Fallback to JSON string representation
  try {
    return JSON.stringify(error)
  } catch {
    return 'An unknown error occurred'
  }
}

export interface ToastOptions {
  message: string
  type?: ToastType
  duration?: number
}

class ToastManager {
  private container: HTMLDivElement | null = null

  private getContainer(): HTMLDivElement {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('Toast manager can only be used in browser environment')
    }
    
    if (!this.container) {
      this.container = document.createElement('div')
      this.container.id = 'toast-container'
      this.container.className = 'fixed top-4 right-4 z-50 space-y-2'
      document.body.appendChild(this.container)
    }
    return this.container
  }

  private getStyles(type: ToastType): string {
    const baseStyles = 'p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-0'
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-600 text-white`
      case 'error':
        return `${baseStyles} bg-red-600 text-white`
      case 'warning':
        return `${baseStyles} bg-yellow-600 text-white`
      case 'info':
      default:
        return `${baseStyles} bg-blue-600 text-white`
    }
  }

  show(options: ToastOptions): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      console.warn('Toast notifications are only available in browser environment')
      return
    }
    
    const { message, type = 'info', duration = 3000 } = options
    
    const container = this.getContainer()
    const toast = document.createElement('div')
    toast.className = this.getStyles(type)
    toast.textContent = message
    
    // Animate in
    toast.style.opacity = '0'
    toast.style.transform = 'translateX(100%)'
    container.appendChild(toast)
    
    // Force reflow
    toast.offsetHeight
    
    // Animate
    requestAnimationFrame(() => {
      toast.style.opacity = '1'
      toast.style.transform = 'translateX(0)'
    })
    
    // Auto remove
    setTimeout(() => {
      toast.style.opacity = '0'
      toast.style.transform = 'translateX(100%)'
      
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast)
        }
      }, 300)
    }, duration)
  }

  success(message: string | any, duration?: number): void {
    // Ensure message is a string
    const msg = typeof message === 'string' 
      ? message 
      : message?.message || message?.error || JSON.stringify(message)
    this.show({ message: msg, type: 'success', duration })
  }

  error(message: string | any, duration?: number): void {
    const msg = extractErrorMessage(message)
    this.show({ message: msg, type: 'error', duration })
  }

  warning(message: string | any, duration?: number): void {
    // Ensure message is a string
    const msg = typeof message === 'string' 
      ? message 
      : message?.message || message?.error || JSON.stringify(message)
    this.show({ message: msg, type: 'warning', duration })
  }

  info(message: string | any, duration?: number): void {
    // Ensure message is a string
    const msg = typeof message === 'string' 
      ? message 
      : message?.message || message?.error || JSON.stringify(message)
    this.show({ message: msg, type: 'info', duration })
  }
}

// Singleton instance
const toast = new ToastManager()

export default toast