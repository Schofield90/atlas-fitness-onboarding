/**
 * Simple toast notification utility
 * Provides consistent error and success messaging
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastOptions {
  message: string
  type?: ToastType
  duration?: number
}

class ToastManager {
  private container: HTMLDivElement | null = null

  private getContainer(): HTMLDivElement {
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

  success(message: string, duration?: number): void {
    this.show({ message, type: 'success', duration })
  }

  error(message: string, duration?: number): void {
    this.show({ message, type: 'error', duration })
  }

  warning(message: string, duration?: number): void {
    this.show({ message, type: 'warning', duration })
  }

  info(message: string, duration?: number): void {
    this.show({ message, type: 'info', duration })
  }
}

// Singleton instance
const toast = new ToastManager()

export default toast