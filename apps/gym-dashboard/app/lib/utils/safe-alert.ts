/**
 * Safe alert function that works with SSR
 * Shows an alert on the client side only
 * On the server side, it logs to console
 */
export function safeAlert(message: string) {
  if (typeof window !== 'undefined') {
    alert(message)
  } else {
    // Server-side: log to console instead
    console.log('[Alert]:', message)
  }
}

/**
 * Safe confirm function that works with SSR
 * Shows a confirm dialog on the client side only
 * On the server side, it logs to console and returns false
 */
export function safeConfirm(message: string): boolean {
  if (typeof window !== 'undefined') {
    return window.confirm(message)
  } else {
    // Server-side: log to console and return false
    console.log('[Confirm]:', message)
    return false
  }
}

/**
 * Safe prompt function that works with SSR
 * Shows a prompt dialog on the client side only
 * On the server side, it logs to console and returns null
 */
export function safePrompt(message: string, defaultValue?: string): string | null {
  if (typeof window !== 'undefined') {
    return window.prompt(message, defaultValue)
  } else {
    // Server-side: log to console and return null
    console.log('[Prompt]:', message)
    return null
  }
}